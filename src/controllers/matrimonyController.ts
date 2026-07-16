import { Request, Response } from 'express';
import MatrimonyProfile from '../models/MatrimonyProfile';
import Message from '../models/Message';

// Get all approved profiles
export const getProfiles = async (req: Request, res: Response) => {
  try {
    const profiles = await MatrimonyProfile.find({ status: 'approved' }).populate('user', 'name phone');
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
