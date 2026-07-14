import { Request, Response } from 'express';
import MatrimonyProfile from '../models/MatrimonyProfile';

// Get all profiles
export const getProfiles = async (req: Request, res: Response) => {
  try {
    const profiles = await MatrimonyProfile.find().populate('user', 'name');
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
    
    res.status(201).json(newProfile);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};
