import { Request, Response } from 'express';
import User from '../models/User';

export const getUserProfile = async (req: Request, res: Response) => {
  const { phone } = req.query;

  if (!phone) {
    return res.status(400).json({ error: 'Phone number is required' });
  }

  try {
    const user = await User.findOne({ phone: phone as string });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      name: user.name,
      email: user.email,
      phone: user.phone,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error fetching user profile' });
  }
};

export const updateUserProfile = async (req: Request, res: Response) => {
  const { phone, name, email } = req.body;

  if (!phone) {
    return res.status(400).json({ error: 'Phone number is required' });
  }

  try {
    let user = await User.findOne({ phone });
    
    if (user) {
      // Update existing user
      if (name !== undefined) user.name = name;
      if (email !== undefined) user.email = email;
      await user.save();
    } else {
      // Create user if not found (fallback)
      user = await User.create({
        phone,
        name: name || 'User',
        email: email || '',
        walletBalance: 0,
      });
    }

    res.json({ 
      message: 'Profile updated successfully', 
      user: { 
        name: user.name, 
        email: user.email, 
        phone: user.phone 
      } 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error updating user profile' });
  }
};
