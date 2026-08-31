import { Request, Response } from 'express';
import User from '../models/User';
import Transaction from '../models/Transaction';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { createNotification } from './notificationController';
import { fulfillOrder } from '../services/fulfillmentService';
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

const COURSE_PRICES: Record<string, number> = {
  'Spoken English': 4999,
  'Spoken Hindi': 3999,
  'Computer Courses': 1200,
  'Competitive Exams': 1500,
  'Full-Stack Web Development': 9999,
  'Data Science & AI/ML': 12499,
  'Mobile App Development': 20000,
  'Digital Marketing Masterclass': 7999,
};

// Razorpay Order Creation (Strict)
export const createRazorpayOrder = async (req: Request, res: Response) => {
  let { amount, userId, category = 'add_money', serviceName, metadata } = req.body; 
  
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    console.error("CRITICAL: Razorpay keys are missing from environment variables.");
    return res.status(500).json({ error: 'Payment gateway is not configured correctly on the server.' });
  }

  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  // Ensure course enrollment payments are true to their prices
  if (category === 'academy_enrollment' && metadata?.courseName) {
    const actualPrice = COURSE_PRICES[metadata.courseName];
    if (actualPrice !== undefined) {
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
        try {
          const fulfillmentResult = await fulfillOrder(transaction, req.app.get('io'));
          return res.json({ 
            success: true, 
            message: "Payment verified and fulfilled successfully", 
            fulfillmentData: fulfillmentResult, 
            category: transaction.category 
          });
        } catch (fulfillmentError: any) {
          console.error("Fulfillment failed after successful payment:", fulfillmentError);
          return res.status(500).json({ 
            error: 'Payment verified, but failed to deliver service.', 
            details: fulfillmentError.message 
          });
        }
      } else {
        // Transaction was already completed (e.g. by webhook) - check if fulfilled
        const existingTx = await Transaction.findOne({ razorpayOrderId: razorpay_order_id });
        if (existingTx && !existingTx.metadata?.fulfilled) {
          const fulfillmentResult = await fulfillOrder(existingTx, req.app.get('io'));
          return res.json({ success: true, message: "Payment fulfilled successfully", fulfillmentData: fulfillmentResult });
        }
        return res.json({ success: true, message: "Payment already verified and fulfilled" });
      }
    } else {
      res.status(400).json({ success: false, error: "Invalid signature" });
    }
  } catch (error) {
    console.error("Verification error:", error);
    res.status(500).json({ error: 'Server error during verification' });
  }
};
