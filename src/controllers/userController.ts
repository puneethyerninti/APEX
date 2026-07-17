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
      _id: user._id,
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
        email: email || `${phone}@apex.local`,
        walletBalance: 0,
      });
      
      // Emit live event to admin dashboard
      const io = req.app.get('io');
      if (io) {
        io.to('admin_room').emit('admin_data_refresh');
      }
    }

    res.json({ 
      message: 'Profile updated successfully', 
      user: { 
        _id: user._id,
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
