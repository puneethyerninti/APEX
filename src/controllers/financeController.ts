import { Request, Response } from 'express';
import User from '../models/User';
import Transaction from '../models/Transaction';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { createNotification } from './notificationController';
import { handleAPEXPlanUpgrade } from './userController';
import { handleMatrimonyUpgrade } from './matrimonyController';
import { handleTravelBooking } from './travelsController';
import { handleUtilityRecharge } from './utilityController';
import { handleAcademyEnrollment } from './academyController';
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'mock_key',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'mock_secret',
});

// Note: In a real app, you would have middleware extracting user ID from JWT
// For this stage, we simulate passing userId in the body or finding the first user

export const getWalletBalance = async (req: Request, res: Response) => {
  try {
    const user = await User.findOne(); // Grab the first user for demo
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    res.json({ balance: user.walletBalance });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

export const deductMoney = async (req: Request, res: Response) => {
  const { amount, category } = req.body;

  try {
    const user = await User.findOne();
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.walletBalance < amount) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    user.walletBalance -= amount;
    await user.save();

    const transaction = await Transaction.create({
      user: user._id,
      amount,
      type: 'debit',
      category: category || 'payment',
      status: 'completed',
    });

    await createNotification(
      user._id.toString(),
      'Payment Successful',
      `₹${amount} has been deducted from your wallet for ${category || 'payment'}.`,
      'success'
    );

    res.json({ message: 'Payment successful', balance: user.walletBalance, transaction });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

export const addMoney = async (req: Request, res: Response) => {
  const { amount } = req.body;

  try {
    const user = await User.findOne();
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.walletBalance += amount;
    await user.save();

    const transaction = await Transaction.create({
      user: user._id,
      amount,
      type: 'credit',
      category: 'add_money',
      status: 'completed',
    });

    await createNotification(
      user._id.toString(),
      'Wallet Recharged',
      `₹${amount} has been added to your wallet.`,
      'success'
    );

    res.json({ message: 'Money added successfully', balance: user.walletBalance, transaction });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

// Razorpay Order Creation (Strict)
export const createRazorpayOrder = async (req: Request, res: Response) => {
  const { amount, userId, category = 'add_money', serviceName, metadata } = req.body; 
  
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    console.error("CRITICAL: Razorpay keys are missing from environment variables.");
    return res.status(500).json({ error: 'Payment gateway is not configured correctly on the server.' });
  }

  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  try {
    const options = {
      amount: Math.round(amount * 100), // convert to paise
      currency: "INR",
      receipt: `receipt_${Date.now()}`
    };
    const order = await razorpay.orders.create(options);
    
    // Create pending transaction
    await Transaction.create({
      user: userId,
      amount,
      type: 'credit',
      category: category,
      referenceId: serviceName || 'wallet_topup',
      status: 'pending',
      razorpayOrderId: order.id,
      metadata: metadata || {}
    });

    res.json({ order, keyId: process.env.RAZORPAY_KEY_ID });
  } catch (error) {
    console.error("Razorpay Error:", error);
    res.status(500).json({ error: 'Failed to create order' });
  }
};

// Razorpay Payment Verification (Strict)
export const verifyRazorpayPayment = async (req: Request, res: Response) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, amount, userId } = req.body;

  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    return res.status(500).json({ error: 'Payment gateway configuration missing' });
  }

  try {
    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(body.toString())
      .digest("hex");

    const isAuthentic = expectedSignature === razorpay_signature;

    if (isAuthentic) {
      // Idempotency: Find the pending transaction and mark it completed
      const transaction = await Transaction.findOneAndUpdate(
        { razorpayOrderId: razorpay_order_id, status: 'pending' },
        { 
          status: 'completed',
          razorpayPaymentId: razorpay_payment_id,
          razorpaySignature: razorpay_signature
        },
        { new: true }
      );

      if (transaction) {
        let fulfillmentResult = null;
        const metadata = transaction.metadata || {};

        // Secure Server-Side Fulfillment
        try {
          switch(transaction.category) {
            case 'add_money':
              await User.findByIdAndUpdate(transaction.user, { $inc: { walletBalance: transaction.amount } });
              break;
            case 'matrimony':
              fulfillmentResult = await handleMatrimonyUpgrade(transaction.user.toString(), metadata.plan || transaction.referenceId?.replace('Matrimony ', '').replace(' Plan', ''));
              break;
            case 'subscription':
              fulfillmentResult = await handleAPEXPlanUpgrade(transaction.user.toString(), metadata.plan || transaction.referenceId);
              break;
            case 'travel_booking':
              fulfillmentResult = await handleTravelBooking(transaction.user.toString(), metadata);
              break;
            case 'mobile_recharge':
              fulfillmentResult = await handleUtilityRecharge(transaction.user.toString(), metadata);
              break;
            case 'academy_enrollment':
              fulfillmentResult = await handleAcademyEnrollment(transaction.user.toString(), metadata);
              break;
            case 'charity':
              // Charity just takes money, no fulfillment required
              break;
          }

          // Global success notification
          await createNotification(
            transaction.user.toString(),
            'Payment Successful',
            `Your payment of ₹${transaction.amount} for ${transaction.referenceId || transaction.category} was successful.`,
            'success'
          );

          const io = req.app.get('io');
          if (io) {
              io.to('admin_room').emit('admin_data_refresh', { type: 'new_transaction', data: transaction });
          }
          
          return res.json({ success: true, message: "Payment verified successfully", fulfillmentData: fulfillmentResult, category: transaction.category });
        } catch (fulfillmentError: any) {
           console.error("Fulfillment failed after successful payment:", fulfillmentError);
           // NOTE: In a robust production system, if fulfillment fails after payment, you would either queue it for retry or auto-refund the user.
           return res.status(500).json({ error: 'Payment verified, but failed to deliver service.', details: fulfillmentError.message });
        }
      } else {
        // Transaction was already completed or not found
        return res.json({ success: true, message: "Payment already verified" });
      }
    } else {
      res.status(400).json({ success: false, error: "Invalid signature" });
    }
  } catch (error) {
    console.error("Verification error:", error);
    res.status(500).json({ error: 'Server error during verification' });
  }
};
