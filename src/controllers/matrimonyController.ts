import { Request, Response } from 'express';
import mongoose from 'mongoose';
import MatrimonyProfile from '../models/MatrimonyProfile';
import Message from '../models/Message';

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
          const otherProfile = await MatrimonyProfile.findOne({ user: otherUserId }).populate('user', 'name phone');
          
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
