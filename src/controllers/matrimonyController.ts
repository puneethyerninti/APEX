import { Request, Response } from 'express';
import mongoose from 'mongoose';
import MatrimonyProfile from '../models/MatrimonyProfile';
import Message from '../models/Message';
import Transaction from '../models/Transaction';
import User from '../models/User';
import { createNotification } from './notificationController';

export const getMyProfile = async (req: Request, res: Response) => {
  try {
    const { userId } = req.query;
    const profile = await MatrimonyProfile.findOne({ user: userId } as any);
    res.json(profile);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

// Get all approved profiles
export const getProfiles = async (req: Request, res: Response) => {
  try {
    const { userId } = req.query;
    const query: any = { status: 'approved' };
    
    if (userId && userId !== 'undefined') {
      query.user = { $ne: userId };
    }
    
    const profiles = await MatrimonyProfile.find(query).populate('user', 'name phone');
    res.json(profiles);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

// Create a profile
export const createProfile = async (req: Request, res: Response) => {
  try {
    const { userId, age, height, religion, profession, location, bio } = req.body;
    
    // Check if profile exists
    const existing = await MatrimonyProfile.findOne({ user: userId });
    if (existing) {
      return res.status(400).json({ error: 'Profile already exists for this user' });
    }

    const newProfile = await MatrimonyProfile.create({
      user: userId,
      age,
      height,
      religion,
      profession,
      location,
      bio,
      images: [] // Handle image uploads in real implementation
    });
    
    // Emit live event to admin dashboard
    const io = req.app.get('io');
    if (io) {
      io.to('admin_room').emit('admin_data_refresh');
    }

    if (userId) {
      await createNotification(
        userId,
        'Profile Created',
        'Your matrimony profile has been submitted and is pending review.',
        'info'
      );
    }
    
    res.status(201).json(newProfile);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

// Get chat messages for a specific room
export const getMessages = async (req: Request, res: Response) => {
  const { roomId } = req.params;
  try {
    const messages = await Message.find({ roomId }).sort({ timestamp: 1 });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: 'Server error fetching messages' });
  }
};

// Mark messages as read
export const markMessagesAsRead = async (req: Request, res: Response) => {
  const { roomId } = req.params;
  const { userId } = req.body; // The user who is reading the messages
  
  try {
    // Update all messages in this room sent TO this user as read
    await Message.updateMany(
      { roomId, receiverId: userId, isRead: false },
      { $set: { isRead: true } }
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Server error marking messages as read' });
  }
};

// Get inbox for a user
export const getInbox = async (req: Request, res: Response) => {
  const { userId } = req.params;
  try {
    const messages = await Message.find({ $or: [{ senderId: userId }, { receiverId: userId }] })
      .sort({ timestamp: -1 });

    const inboxMap = new Map();
    
    for (const msg of messages) {
      if (!inboxMap.has(msg.roomId)) {
        const otherUserId = msg.senderId === userId ? msg.receiverId : msg.senderId;
        
        if (mongoose.Types.ObjectId.isValid(otherUserId)) {
          let otherProfile = await MatrimonyProfile.findOne({ user: otherUserId }).populate('user', 'name phone');
          
          if (!otherProfile) {
            const fallbackUser = await User.findById(otherUserId);
            if (fallbackUser) {
              otherProfile = {
                user: fallbackUser,
                images: fallbackUser.profilePicture ? [fallbackUser.profilePicture] : []
              } as any;
            }
          }

          if (otherProfile) {
            inboxMap.set(msg.roomId, {
              latestMessage: msg,
              profile: otherProfile
            });
          }
        }
      }
    }

    const inbox = Array.from(inboxMap.values());
    res.json(inbox);
  } catch (error) {
    res.status(500).json({ error: 'Server error fetching inbox' });
  }
};

// Upgrade Profile / Purchase Subscription
export const upgradeProfile = async (req: Request, res: Response) => {
  try {
    const { userId, plan, amount } = req.body;
    
    // Find the user's profile
    const profile = await MatrimonyProfile.findOne({ user: userId } as any);
    
    if (!profile) {
      return res.status(404).json({ error: 'Matrimony profile not found' });
    }

    // Update profile
    profile.subscription = {
      plan,
      isActive: true
    };
    await profile.save();

    // Create a transaction record for Admin Dashboard
    const numericAmount = parseInt(amount.replace(/[^0-9]/g, ''), 10) || 5000;
    
    await Transaction.create({
      user: userId,
      type: 'debit',
      amount: numericAmount,
      category: `Purchased Matrimony ${plan} Plan`,
      status: 'completed'
    } as any);

    // Notify Admin Dashboard in real-time
    const io = req.app.get('io');
    if (io) {
      io.to('admin_room').emit('admin_data_refresh');
    }

    res.json({ success: true, message: 'Subscription upgraded successfully!', profile });
  } catch (error) {
    console.error('Upgrade error:', error);
    res.status(500).json({ error: 'Server error during upgrade' });
  }
};
