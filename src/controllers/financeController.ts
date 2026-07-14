import { Request, Response } from 'express';
import User from '../models/User';
import Transaction from '../models/Transaction';

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

    res.json({ message: 'Money added successfully', balance: user.walletBalance, transaction });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};
