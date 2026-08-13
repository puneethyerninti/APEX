import { Request, Response } from 'express';
import { createNotification } from './notificationController';
import User from '../models/User';
import Transaction from '../models/Transaction';

export const payBill = async (req: Request, res: Response) => {
  const { userId, billerName, amount } = req.body;

  if (!userId || !billerName) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const numericAmount = parseInt(amount.toString().replace(/[^0-9]/g, ''), 10) || 500;

    // Record the mock transaction
    await Transaction.create({
      user: userId,
      amount: numericAmount,
      type: 'debit',
      category: 'utility_payment',
      status: 'completed',
      referenceId: `bill_${Date.now()}`
    } as any);

    // Send Real-Time Notification
    await createNotification(
      userId,
      'Bill Payment Successful',
      `Your payment of ₹${numericAmount} for ${billerName} was successful.`,
      'success'
    );

    res.json({ success: true, message: 'Bill paid successfully' });
  } catch (error) {
    console.error('Error paying bill:', error);
    res.status(500).json({ error: 'Server error' });
  }
};
