import mongoose from 'mongoose';
import { Request, Response } from 'express';
import User from '../models/User';
import Transaction from '../models/Transaction';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { createNotification } from './notificationController';
import { fulfillOrder } from '../services/fulfillmentService';
import { createPendingUtilityTransaction, updateUtilityTransactionStatus } from './utilityController';
import axios from 'axios';
import Course from '../models/Course';

// Razorpay will be instantiated dynamically to avoid crashing the server on startup if keys are missing
let razorpayInstance: any = null;

export const getRazorpay = () => {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw new Error("Razorpay keys missing");
  }
  if (!razorpayInstance) {
    razorpayInstance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return razorpayInstance;
};

/**
 * Strict user resolution utility for production finance operations.
 * Extracts user from JWT auth token, query params, or body payload.
 */
export const resolveUser = async (req: Request): Promise<any> => {
  let userId = (req as any).user?.id || (req as any).user?._id;

  if (!userId) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded: any = jwt.verify(token, process.env.JWT_SECRET as string);
        if (decoded?.id) userId = decoded.id;
      } catch (e) {}
    }
  }

  if (!userId) {
    userId = req.query.userId || req.body.userId;
  }

  const phone = req.query.phone || req.body.phone;

  if (userId && mongoose.Types.ObjectId.isValid(String(userId))) {
    const user = await User.findById(userId);
    if (user) return user;
  }

  if (phone) {
    const cleanPhone = String(phone).replace(/[^\d]/g, '').slice(-10);
    const user = await User.findOne({
      $or: [
        { phone: cleanPhone },
        { phone: `+91${cleanPhone}` }
      ]
    });
    if (user) return user;
  }

  if (userId && typeof userId === 'string') {
    const cleanPhone = userId.replace(/[^\d]/g, '').slice(-10);
    if (cleanPhone.length === 10) {
      const user = await User.findOne({
        $or: [
          { phone: cleanPhone },
          { phone: `+91${cleanPhone}` }
        ]
      });
      if (user) return user;
    }
  }

  return null;
};

/**
 * GET /api/finance/wallet
 * Returns real-time wallet balance for the authenticated user.
 */
export const getWalletBalance = async (req: Request, res: Response) => {
  try {
    const user = await resolveUser(req);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Authentication required. Please login.' });
    }
    
    res.json({ 
      success: true, 
      balance: user.walletBalance || 0,
      user: {
        _id: user._id,
        name: user.name,
        phone: user.phone,
        email: user.email
      }
    });
  } catch (error) {
    console.error('getWalletBalance Error:', error);
    res.status(500).json({ success: false, error: 'Server error retrieving wallet balance' });
  }
};

/**
 * POST /api/finance/wallet/deduct
 * Atomically deducts funds from user's wallet with session transaction.
 */
export const deductMoney = async (req: Request, res: Response) => {
  const { amount, category, referenceId, note } = req.body;
  if (!amount || amount <= 0) {
    return res.status(400).json({ success: false, error: 'Invalid deduction amount' });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const user = await resolveUser(req);
    if (!user) {
      await session.abortTransaction();
      return res.status(401).json({ success: false, error: 'User not found or unauthenticated' });
    }

    const liveUser = await User.findById(user._id).session(session);
    if (!liveUser || liveUser.walletBalance < amount) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, error: 'Insufficient wallet balance' });
    }

    liveUser.walletBalance -= amount;
    await liveUser.save({ session });

    const transaction = await Transaction.create([{
      user: liveUser._id,
      amount,
      type: 'debit',
      category: category || 'payment',
      referenceId: referenceId || 'Wallet Debit',
      status: 'completed',
      metadata: { note }
    }], { session });

    await session.commitTransaction();

    const io = req.app.get('io');
    if (io) {
      io.to(`user_${liveUser._id}`).emit('wallet_update', {
        amount,
        type: 'debit',
        message: `₹${amount} debited from wallet`,
        newBalance: liveUser.walletBalance
      });
    }

    await createNotification(
      liveUser._id.toString(),
      'Payment Successful',
      `₹${amount} has been deducted from your wallet for ${referenceId || category || 'payment'}.`,
      'success'
    );

    res.json({ 
      success: true, 
      message: 'Payment successful', 
      balance: liveUser.walletBalance, 
      transaction: transaction[0] 
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('deductMoney Error:', error);
    res.status(500).json({ success: false, error: 'Server error processing deduction' });
  } finally {
    session.endSession();
  }
};

/**
 * POST /api/finance/wallet/add
 * Atomically adds funds to user's wallet with session transaction.
 */
export const addMoney = async (req: Request, res: Response) => {
  const { amount, referenceId, note } = req.body;
  if (!amount || amount <= 0) {
    return res.status(400).json({ success: false, error: 'Invalid top-up amount' });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const user = await resolveUser(req);
    if (!user) {
      await session.abortTransaction();
      return res.status(401).json({ success: false, error: 'User not found or unauthenticated' });
    }

    const liveUser = await User.findById(user._id).session(session);
    if (!liveUser) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    liveUser.walletBalance += amount;
    await liveUser.save({ session });

    const transaction = await Transaction.create([{
      user: liveUser._id,
      amount,
      type: 'credit',
      category: 'add_money',
      referenceId: referenceId || 'Wallet Recharge',
      status: 'completed',
      metadata: { note }
    }], { session });

    await session.commitTransaction();

    const io = req.app.get('io');
    if (io) {
      io.to(`user_${liveUser._id}`).emit('wallet_update', {
        amount,
        type: 'credit',
        message: `₹${amount} added to wallet`,
        newBalance: liveUser.walletBalance
      });
    }

    await createNotification(
      liveUser._id.toString(),
      'Wallet Recharged',
      `₹${amount} has been added to your wallet.`,
      'success'
    );

    res.json({ 
      success: true, 
      message: 'Money added successfully', 
      balance: liveUser.walletBalance, 
      transaction: transaction[0] 
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('addMoney Error:', error);
    res.status(500).json({ success: false, error: 'Server error adding money' });
  } finally {
    session.endSession();
  }
};

/**
 * POST /api/finance/wallet/transfer
 * Real-time atomic P2P wallet transfer between APEX users via phone number.
 */
export const transferMoney = async (req: Request, res: Response) => {
  const { recipientPhone, note } = req.body;
  const amount = Number(req.body.amount);

  if (!Number.isFinite(amount) || amount < 0.01) {
    return res.status(400).json({ success: false, error: 'Please enter a valid transfer amount' });
  }

  if (!recipientPhone) {
    return res.status(400).json({ success: false, error: 'Recipient phone number is required' });
  }

  const cleanRecipientPhone = String(recipientPhone).replace(/[^\d]/g, '').slice(-10);
  if (cleanRecipientPhone.length !== 10) {
    return res.status(400).json({ success: false, error: 'Please enter a valid 10-digit mobile number' });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const sender = await resolveUser(req);
    if (!sender) {
      await session.abortTransaction();
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const liveSender = await User.findById(sender._id).session(session);
    if (!liveSender) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, error: 'Sender account not found' });
    }

    if (liveSender.walletBalance < amount) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, error: `Insufficient wallet balance (₹${liveSender.walletBalance})` });
    }

    // Lookup recipient
    const recipient = await User.findOne({
      $or: [
        { phone: cleanRecipientPhone },
        { phone: `+91${cleanRecipientPhone}` }
      ]
    }).session(session);

    if (!recipient) {
      await session.abortTransaction();
      return res.status(404).json({ 
        success: false, 
        error: `User with phone (+91 ${cleanRecipientPhone}) is not registered on APEX.` 
      });
    }

    if (recipient._id.toString() === liveSender._id.toString()) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, error: 'Cannot transfer money to your own account' });
    }

    // Atomic debit from sender & credit to recipient
    liveSender.walletBalance -= amount;
    recipient.walletBalance += amount;

    await liveSender.save({ session });
    await recipient.save({ session });

    // Debit transaction for sender
    const senderTx = await Transaction.create([{
      user: liveSender._id,
      amount,
      type: 'debit',
      category: 'p2p_transfer',
      referenceId: `Sent to ${recipient.name || recipient.phone}`,
      status: 'completed',
      metadata: {
        recipientId: recipient._id.toString(),
        recipientName: recipient.name,
        recipientPhone: recipient.phone,
        note: note || ''
      }
    }], { session });

    // Credit transaction for recipient
    await Transaction.create([{
      user: recipient._id,
      amount,
      type: 'credit',
      category: 'p2p_receive',
      referenceId: `Received from ${liveSender.name || liveSender.phone}`,
      status: 'completed',
      metadata: {
        senderId: liveSender._id.toString(),
        senderName: liveSender.name,
        senderPhone: liveSender.phone,
        note: note || ''
      }
    }], { session });

    await session.commitTransaction();

    const io = req.app.get('io');
    if (io) {
      // Live sync to sender
      io.to(`user_${liveSender._id}`).emit('wallet_update', {
        amount,
        type: 'debit',
        message: `₹${amount} sent to ${recipient.name || cleanRecipientPhone}`,
        newBalance: liveSender.walletBalance
      });

      // Live sync to recipient
      io.to(`user_${recipient._id}`).emit('wallet_update', {
        amount,
        type: 'credit',
        message: `₹${amount} received from ${liveSender.name || liveSender.phone}`,
        newBalance: recipient.walletBalance
      });
    }

    // Push / in-app notifications
    await createNotification(
      liveSender._id.toString(),
      'Transfer Successful',
      `You sent ₹${amount} to ${recipient.name || cleanRecipientPhone}.`,
      'success'
    );

    await createNotification(
      recipient._id.toString(),
      'Money Received!',
      `You received ₹${amount} from ${liveSender.name || liveSender.phone}.`,
      'success'
    );

    res.json({
      success: true,
      message: `₹${amount} transferred to ${recipient.name || cleanRecipientPhone} successfully`,
      newBalance: liveSender.walletBalance,
      transaction: senderTx[0]
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('transferMoney Error:', error);
    res.status(500).json({ success: false, error: 'Server error during transfer' });
  } finally {
    session.endSession();
  }
};

/**
 * POST /api/finance/wallet/withdraw
 * RazorpayX Payouts Integration
 */
export const withdrawToBank = async (req: Request, res: Response) => {
  const { method, destination, note } = req.body;
  const amount = Number(req.body.amount);
  if (!process.env.RAZORPAYX_ACCOUNT_NUMBER || !(process.env.RAZORPAYX_KEY_ID || process.env.RAZORPAY_KEY_ID) || !(process.env.RAZORPAYX_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET)) {
    return res.status(503).json({ success: false, error: 'Withdrawals are unavailable until the payout account is configured. Your wallet has not been debited.' });
  }
  // method: 'UPI' | 'IMPS'
  // destination: 'user@upi' or '{ account_number, ifsc }'

  if (!Number.isFinite(amount) || amount < 50) {
    return res.status(400).json({ success: false, error: 'Minimum withdrawal is ₹50' });
  }

  if (!destination) {
    return res.status(400).json({ success: false, error: 'Destination account required' });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const user = await resolveUser(req);
    if (!user) {
      await session.abortTransaction();
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const liveUser = await User.findById(user._id).session(session);
    if (!liveUser) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, error: 'User account not found' });
    }

    if (liveUser.walletBalance < amount) {
      await session.abortTransaction();
      return res.status(400).json({ 
        success: false, 
        error: `Insufficient balance (₹${liveUser.walletBalance})` 
      });
    }

    // Deduct immediately for safety
    liveUser.walletBalance -= amount;
    await liveUser.save({ session });

    let razorpayPayoutId = 'simulated_' + Date.now();
    let status = 'processing';
    const rxKeyId = process.env.RAZORPAYX_KEY_ID || process.env.RAZORPAY_KEY_ID;
    const rxKeySecret = process.env.RAZORPAYX_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET;
    const accountNumber = process.env.RAZORPAYX_ACCOUNT_NUMBER;

    if (rxKeyId && rxKeySecret && accountNumber) {
      try {
        const authHeader = `Basic ${Buffer.from(`${rxKeyId}:${rxKeySecret}`).toString('base64')}`;
        // 1. Create Contact
        const contactRes = await axios.post('https://api.razorpay.com/v1/contacts', {
          name: liveUser.name || 'APEX User',
          contact: liveUser.phone,
          type: 'customer',
          reference_id: liveUser._id.toString()
        }, { headers: { Authorization: authHeader } });

        // 2. Create Fund Account
        const fundDetails = method === 'UPI' 
          ? { account_type: 'vpa', vpa: { address: destination } }
          : { account_type: 'bank_account', bank_account: destination };
          
        const fundRes = await axios.post('https://api.razorpay.com/v1/fund_accounts', {
          contact_id: contactRes.data.id,
          ...fundDetails
        }, { headers: { Authorization: authHeader } });

        // 3. Initiate Payout
        const payoutRes = await axios.post('https://api.razorpay.com/v1/payouts', {
          account_number: accountNumber,
          fund_account_id: fundRes.data.id,
          amount: Math.round(amount * 100),
          currency: 'INR',
          mode: method,
          purpose: 'payout',
          queue_if_low_balance: true,
          reference_id: `wth_${Date.now()}`
        }, { headers: { Authorization: authHeader } });

        razorpayPayoutId = payoutRes.data.id;
        status = payoutRes.data.status; // 'processing', 'queued', 'processed'
      } catch (rxError: any) {
        console.error('RazorpayX Error:', rxError?.response?.data || rxError.message);
        await session.abortTransaction();
        return res.status(500).json({ success: false, error: 'Payment gateway error. Contact support.' });
      }
    } else {
      console.warn('RazorpayX keys missing. Falling back to simulated payout.');
      status = 'pending';
    }

    const transaction = await Transaction.create([{
      user: liveUser._id,
      amount,
      type: 'debit',
      category: 'withdrawal',
      referenceId: razorpayPayoutId,
      status: status === 'processed' ? 'completed' : 'pending',
      metadata: { method, destination, note, payoutStatus: status }
    }], { session });

    await session.commitTransaction();

    const io = req.app.get('io');
    if (io) {
      io.to(`user_${liveUser._id}`).emit('wallet_update', {
        amount,
        type: 'debit',
        message: `₹${amount} withdrawal initiated`,
        newBalance: liveUser.walletBalance
      });
    }

    await createNotification(
      liveUser._id.toString(),
      'Withdrawal Initiated',
      `Your request to withdraw ₹${amount} to ${method} is being processed.`,
      'success'
    );

    res.json({
      success: true,
      message: 'Withdrawal initiated successfully',
      newBalance: liveUser.walletBalance,
      transaction: transaction[0]
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('withdrawToBank Error:', error);
    res.status(500).json({ success: false, error: 'Server error processing withdrawal' });
  } finally {
    session.endSession();
  }
};

/**
 * POST /api/finance/wallet/pay-merchant
 * Direct QR scan & pay using wallet balance.
 */
export const payMerchantWithWallet = async (req: Request, res: Response) => {
  return res.status(503).json({ success: false, error: 'Merchant wallet payments are unavailable. Use your UPI app to pay the merchant.' });
};

/**
 * GET /api/finance/transactions
 * Passbook ledger endpoint with pagination and category filtering.
 */
export const getUserTransactions = async (req: Request, res: Response) => {
  try {
    const user = await resolveUser(req);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const filter: any = { user: user._id };
    if (req.query.type && ['credit', 'debit'].includes(req.query.type as string)) {
      filter.type = req.query.type;
    }
    if (req.query.category) {
      filter.category = req.query.category;
    }

    const [transactions, total] = await Promise.all([
      Transaction.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Transaction.countDocuments(filter)
    ]);

    res.json({
      success: true,
      transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('getUserTransactions Error:', error);
    res.status(500).json({ success: false, error: 'Server error fetching passbook transactions' });
  }
};

/**
 * GET /api/finance/my-qr
 * Generates user's personal UPI and APEX QR string for receiving money.
 */
export const getMyQrPayload = async (req: Request, res: Response) => {
  try {
    const user = await resolveUser(req);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const cleanPhone = (user.phone || '').replace(/[^\d]/g, '').slice(-10);
    const userName = user.name || 'APEX User';
    
    const apexUri = `apex://pay?phone=${cleanPhone}&name=${encodeURIComponent(userName)}&id=${user._id}`;

    res.json({
      success: true,
      apexUri,
      user: {
        _id: user._id,
        name: user.name,
        phone: user.phone
      }
    });
  } catch (error) {
    console.error('getMyQrPayload Error:', error);
    res.status(500).json({ success: false, error: 'Server error generating QR code' });
  }
};


const isUtilityCategory = (category: string) => ['mobile_recharge', 'bbps_payment'].includes(category);

const scheduleUtilityFulfillment = async (transaction: any, io: any) => {
  const metadata = transaction.metadata || {};
  const queued = await Transaction.findOneAndUpdate(
    { _id: transaction._id, 'metadata.fulfillmentQueued': { $ne: true }, 'metadata.fulfilled': { $ne: true } },
    {
      $set: {
        'metadata.fulfillmentQueued': true,
        'metadata.fulfillmentQueuedAt': new Date()
      }
    },
    { new: true }
  );

  if (!queued) {
    return;
  }

  const utilityTransactionId = metadata.utilityTransactionId;
  if (utilityTransactionId) {
    await updateUtilityTransactionStatus(
      utilityTransactionId,
      'fulfillment_pending',
      'Payment received. Utility service is processing.',
      {
        razorpayPaymentId: transaction.razorpayPaymentId,
        razorpayOrderId: transaction.razorpayOrderId
      },
      io
    );
  }

  setImmediate(async () => {
    try {
      await fulfillOrder(queued, io);
    } catch (error) {
      console.error(`[Utility Fulfillment] Async fulfillment failed for ${queued._id}:`, error);
    }
  });
};

// Razorpay Order Creation (Strict)
export const createRazorpayOrder = async (req: Request, res: Response) => {
  let { amount, userId, category = 'add_money', serviceName, metadata } = req.body; 
  
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    console.error("CRITICAL: Razorpay keys are missing from environment variables.");
    return res.status(500).json({ error: 'Payment gateway is not configured correctly on the server.' });
  }

  const user = await resolveUser(req);
  if (!user) return res.status(401).json({ error: 'Please login to make a payment.' });
  userId = user._id;
  amount = Number(amount);
  if (!Number.isFinite(amount) || amount < 0.01 || !Number.isSafeInteger(Math.round(amount * 100))) {
    return res.status(400).json({ error: 'Enter a valid payment amount.' });
  }
  const supportedCategories = ['add_money', 'wallet_recharge', 'mobile_recharge', 'bbps_payment', 'matrimony', 'subscription', 'travel_booking', 'academy_enrollment', 'charity'];
  if (!supportedCategories.includes(category)) {
    return res.status(400).json({ error: 'This payment service is unavailable. Pay external merchants using your UPI app.' });
  }
  const reservedMetadata = new Set(['fulfilled', 'fulfilledAt', 'fulfillmentResult', 'fulfillmentError', 'fulfillmentFailedAt', 'fulfillmentQueued', 'fulfillmentQueuedAt', 'fulfillmentInProgress', 'fulfillmentStartedAt', 'refundInfo', 'utilityTransactionId']);
  metadata = Object.fromEntries(Object.entries(metadata && typeof metadata === 'object' && !Array.isArray(metadata) ? metadata : {})
    .filter(([key]) => !reservedMetadata.has(key)));

  // Ensure course enrollment payments are true to their prices
  if (category === 'academy_enrollment' && metadata?.courseName) {
    const course = await Course.findOne({ title: metadata.courseName, status: 'active' });
    if (course) {
      const actualPrice = course.price;
      if (amount !== actualPrice) {
        console.warn(`Price mismatch for ${metadata.courseName}. Received: ${amount}, Expected: ${actualPrice}. Overriding to true price.`);
      }
      amount = actualPrice; // Keep it true to its price
    } else {
      return res.status(400).json({ error: 'Invalid course selection' });
    }
  }

  try {
    const options = {
      amount: Math.round(amount * 100), // convert to paise
      currency: "INR",
      receipt: `receipt_${Date.now()}`
    };
    const order = await getRazorpay().orders.create(options);
    const utilityTransaction = await createPendingUtilityTransaction(userId, category, amount, metadata || {}, order.id);
    
    const txType = ['add_money', 'wallet_recharge'].includes(category) ? 'credit' : 'debit';
    // Create pending transaction
    await Transaction.create({
      user: userId,
      amount,
      type: txType,
      category: category,
      referenceId: serviceName || 'wallet_topup',
      status: 'pending',
      razorpayOrderId: order.id,
      metadata: {
        ...(metadata || {}),
        ...(utilityTransaction ? {
          utilityTransactionId: utilityTransaction._id.toString(),
          client_ref_id: utilityTransaction.clientRefId
        } : {})
      }
    });

    res.json({
      order,
      keyId: process.env.RAZORPAY_KEY_ID,
      utilityTransactionId: utilityTransaction?._id
    });
  } catch (error) {
    console.error("Razorpay Error:", error);
    res.status(500).json({ error: 'Failed to create order' });
  }
};

// Razorpay Payment Verification (Strict)
export const verifyRazorpayPayment = async (req: Request, res: Response) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    return res.status(503).json({ error: 'Payment gateway configuration missing' });
  }
  if (![razorpay_order_id, razorpay_payment_id, razorpay_signature].every(value => typeof value === 'string' && value.length > 0)) {
    return res.status(400).json({ success: false, error: 'Payment verification details are required.' });
  }
  try {
    const user = await resolveUser(req);
    if (!user) return res.status(401).json({ error: 'Please login to verify payment.' });
    let transaction = await Transaction.findOne({ razorpayOrderId: razorpay_order_id, user: user._id });
    if (!transaction) return res.status(404).json({ success: false, error: 'Payment order not found.' });
    const expected = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(transaction.razorpayOrderId + '|' + razorpay_payment_id).digest('hex');
    if (!/^[a-f0-9]{64}$/i.test(razorpay_signature) ||
        !crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(razorpay_signature, 'hex'))) {
      return res.status(400).json({ success: false, error: 'Invalid payment signature.' });
    }
    const payment = await getRazorpay().payments.fetch(razorpay_payment_id);
    if (payment.order_id !== transaction.razorpayOrderId ||
        Number(payment.amount) !== Math.round(transaction.amount * 100) || payment.currency !== 'INR') {
      return res.status(400).json({ success: false, error: 'Payment does not match this order.' });
    }
    if (payment.status !== 'captured') {
      return res.status(409).json({ success: false, status: 'payment_pending', error: 'Payment has not been captured yet. Please check your payment history shortly.' });
    }
    if (transaction.status === 'refunded' || transaction.metadata?.fulfillmentError) {
      return res.status(409).json({ success: false, status: transaction.status, error: 'This payment needs support review or has been refunded.' });
    }
    const captured = await Transaction.findOneAndUpdate(
      { _id: transaction._id, status: { $in: ['pending', 'failed'] }, 'metadata.fulfillmentError': { $exists: false } },
      { $set: { status: 'completed', razorpayPaymentId: razorpay_payment_id, razorpaySignature: razorpay_signature } },
      { new: true }
    );
    transaction = captured || await Transaction.findById(transaction._id);
    if (!transaction || transaction.status !== 'completed' || transaction.razorpayPaymentId !== razorpay_payment_id) {
      return res.status(409).json({ success: false, error: 'Payment is awaiting reconciliation.' });
    }
    if (isUtilityCategory(transaction.category)) {
      await scheduleUtilityFulfillment(transaction, req.app.get('io'));
      return res.json({ success: true, category: transaction.category,
        utilityTransactionId: transaction.metadata?.utilityTransactionId, status: 'fulfillment_pending' });
    }
    const fulfillmentData = await fulfillOrder(transaction, req.app.get('io'));
    return res.json({ success: true, category: transaction.category, fulfillmentData,
      message: 'Payment verified and service delivered.' });
  } catch (error: any) {
    console.error('Payment verification failed:', error.message);
    return res.status(500).json({ success: false, error: 'Payment confirmation is delayed. Check payment history before paying again.' });
  }
};
