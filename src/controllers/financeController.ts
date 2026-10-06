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
import WalletTransfer from '../models/WalletTransfer';
import MatrimonyProfile from '../models/MatrimonyProfile';
import { normalizePlan, matrimonyPlans } from '../services/matrimonyPolicy';

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
  const id = (req as any).user?.id;
  return id && mongoose.isValidObjectId(String(id)) ? User.findById(id) : null;
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
  const amount = Number(req.body.amount);
  const rawAmount = String(req.body.amount);
  const recipientPhone = String(req.body.recipientPhone || '').replace(/[\s()-]/g, '').replace(/^\+91/, '');
  const key = String(req.body.idempotencyKey || '');
  const note = String(req.body.note || '').trim().slice(0, 250);
  if (!/^\d+(\.\d{1,2})?$/.test(rawAmount) || !Number.isFinite(amount) || amount < 0.01 || amount > 100000 ||
      !/^[6-9]\d{9}$/.test(recipientPhone) || !/^[a-zA-Z0-9-]{16,80}$/.test(key)) {
    return res.status(400).json({ error: 'Valid mobile, amount (two decimal places maximum) and transfer reference required.' });
  }
  const senderId = (req as any).user.id;
  const session = await mongoose.startSession();
  let result: any;
  let recipientId: string | undefined;
  let fresh = false;
  try {
    await session.withTransaction(async () => {
      fresh = false;
      const existing = await WalletTransfer.findOne({ user: senderId, key }).session(session);
      if (existing) {
        if (existing.amount !== amount || existing.recipientPhone !== recipientPhone || existing.note !== note) throw Object.assign(new Error('Transfer reference already used for different details.'), { httpStatus: 409 });
        result = existing.result;
        return;
      }
      const recipient = await User.findOne({ $or: [{ phone: recipientPhone }, { phone: '+91' + recipientPhone }], firebaseUid: { $exists: true } }).session(session);
      if (!recipient) throw Object.assign(new Error('Recipient must sign in to APEX with this mobile number first. This is an APEX wallet transfer, not a bank transfer.'), { httpStatus: 404 });
      if (recipient._id.toString() === String(senderId)) throw Object.assign(new Error('Cannot transfer to your own wallet.'), { httpStatus: 400 });
      await WalletTransfer.create([{ user: senderId, key, recipientPhone, amount, note }], { session });
      const sender = await User.findOneAndUpdate({ _id: senderId, walletBalance: { $gte: amount } }, { $inc: { walletBalance: -amount } }, { session, new: true });
      if (!sender) throw Object.assign(new Error('Insufficient wallet balance.'), { httpStatus: 400 });
      const credited = await User.findByIdAndUpdate(recipient._id, { $inc: { walletBalance: amount } }, { session, new: true });
      if (!credited) throw new Error('Recipient account unavailable.');
      const pair = await Transaction.create([
        { user: senderId, amount, type: 'debit', category: 'p2p_transfer', referenceId: 'Sent to ' + recipient.name, status: 'completed', metadata: { transferKey: key, recipientId: recipient._id.toString(), note } },
        { user: recipient._id, amount, type: 'credit', category: 'p2p_receive', referenceId: 'Received from ' + sender.name, status: 'completed', metadata: { transferKey: key, senderId: String(senderId), note } }
      ], { session });
      result = { success: true, newBalance: sender.walletBalance, recipientBalance: credited.walletBalance, recipientName: recipient.name, transaction: pair[0] };
      recipientId = recipient._id.toString();
      await WalletTransfer.updateOne({ user: senderId, key }, { $set: { result } }, { session });
      fresh = true;
    });
    if (!result) throw new Error('Transfer needs support reconciliation. Do not resend with a different reference.');
    if (fresh) {
      try {
        const io = req.app.get('io');
        io?.to('user_' + senderId).emit('wallet_update', { type: 'debit', amount, newBalance: result.newBalance });
        io?.to('user_' + recipientId).emit('wallet_update', { type: 'credit', amount, newBalance: result.recipientBalance });
      } catch (error) { console.error('Wallet event delivery delayed'); }
      await Promise.allSettled([
        createNotification(String(senderId), 'Transfer completed', 'Your APEX wallet transfer was completed.', 'success'),
        createNotification(recipientId!, 'Money received', 'You received INR ' + amount + ' in your APEX wallet.', 'success')
      ]);
    }
    const { recipientBalance: _privateBalance, ...publicResult } = result;
    return res.json(publicResult);
  } catch (error: any) {
    return res.status(error.code === 11000 ? 409 : error.httpStatus || 503).json({ error: error.code === 11000 ? 'Transfer is processing. Retry using the same reference.' : error.message });
  } finally { await session.endSession(); }
};
/**
 * POST /api/finance/wallet/withdraw
 * RazorpayX Payouts Integration
 */
export const withdrawToBank = async (_req: Request, res: Response) => {
  return res.status(503).json({ success: false, error: 'External wallet payouts are not enabled for this app. Standard Razorpay checkout collects money; it does not send your wallet balance to bank or UPI accounts. Your balance has not changed.' });
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
  const amountText = String(amount);
  amount = Number(amount);
  if (!/^\d+(\.\d{1,2})?$/.test(amountText) || !Number.isFinite(amount) || amount < 0.01 || amount > 100000 || !Number.isSafeInteger(Math.round(amount * 100))) {
    return res.status(400).json({ error: 'Enter a valid payment amount.' });
  }
  const supportedCategories = ['add_money', 'wallet_recharge', 'mobile_recharge', 'bbps_payment', 'matrimony', 'subscription', 'academy_enrollment', 'charity'];
  if (!supportedCategories.includes(category)) {
    return res.status(400).json({ error: 'This payment service is unavailable. Pay external merchants using your UPI app.' });
  }
  const reservedMetadata = new Set(['fulfilled', 'fulfilledAt', 'fulfillmentResult', 'fulfillmentError', 'fulfillmentFailedAt', 'fulfillmentQueued', 'fulfillmentQueuedAt', 'fulfillmentInProgress', 'fulfillmentStartedAt', 'refundInfo', 'utilityTransactionId']);
  metadata = Object.fromEntries(Object.entries(metadata && typeof metadata === 'object' && !Array.isArray(metadata) ? metadata : {})
    .filter(([key]) => !reservedMetadata.has(key)));

  if (category === 'matrimony') {
    const plan = normalizePlan(metadata.plan);
    if (!matrimonyPlans[plan]) return res.status(400).json({ error: 'Select a valid matrimony membership.' });
    const profile = await MatrimonyProfile.findOne({ user: userId, ownerVerified: true, status: 'approved' });
    if (!profile) return res.status(409).json({ error: 'Create your APEX profile and wait for approval before buying membership.' });
    amount = matrimonyPlans[plan].amount;
    metadata = { plan };
  }
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
    if (Number(payment.amount_refunded || 0) > 0) {
      return res.status(409).json({ success: false, error: 'Refunded payment requires support review.' });
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
