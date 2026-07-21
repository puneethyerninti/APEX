import { Request, Response } from 'express';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import Transaction from '../models/Transaction';

let razorpay: any;
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}

export const createOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const { amount } = req.body;
    
    if (!amount || isNaN(amount)) {
      res.status(400).json({ success: false, message: 'Valid amount is required' });
      return;
    }

    const options = {
      amount: Math.round(amount * 100), // amount in the smallest currency unit (paise for INR)
      currency: "INR",
      receipt: `receipt_${Date.now()}`
    };

    if (!razorpay) {
      console.log("=== MOCK RAZORPAY ORDER CREATED ===");
      res.status(200).json({
        success: true,
        mockMode: true,
        order: {
          id: `order_mock_${Date.now()}`,
          amount: options.amount,
          currency: options.currency,
          receipt: options.receipt
        }
      });
      return;
    }

    const order = await razorpay.orders.create(options);
    
    res.status(200).json({
      success: true,
      order,
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const verifyPayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay) {
      console.log("=== MOCK RAZORPAY PAYMENT VERIFIED ===");
      res.status(200).json({ success: true, mockMode: true, message: "Payment verified successfully (Mock)" });
      return;
    }

    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET as string)
      .update(sign.toString())
      .digest("hex");

    if (razorpay_signature === expectedSign) {
      // Signature is valid. Payment is successful.
      // Here you could update the user's wallet, save transaction to DB, etc.
      res.status(200).json({ success: true, message: "Payment verified successfully" });
    } else {
      // Invalid signature
      res.status(400).json({ success: false, message: "Invalid payment signature" });
    }
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const recordMockTransaction = async (req: Request, res: Response): Promise<void> => {
  try {
    const { amount, userId } = req.body;

    if (!amount || !userId) {
      res.status(400).json({ success: false, message: 'Amount and userId are required' });
      return;
    }

    const transaction = new Transaction({
      user: userId,
      amount: Number(amount),
      type: 'credit',
      category: 'add_money',
      status: 'completed',
      referenceId: `mock_pay_${Date.now()}`
    });

    await transaction.save();

    res.status(201).json({
      success: true,
      message: 'Mock transaction recorded successfully',
      transaction
    });
  } catch (error) {
    console.error('Error recording mock transaction:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};
