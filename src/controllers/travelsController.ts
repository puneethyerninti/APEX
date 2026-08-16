import { Request, Response } from 'express';
import TravelBooking from '../models/TravelBooking';
import User from '../models/User';
import Transaction from '../models/Transaction';
import { createNotification } from './notificationController';

// Create a new travel booking
export const handleTravelBooking = async (userId: string, metadata: any) => {
  const { type, vehicleType, origin, destination, amount } = metadata;
  
  let user;
  try {
    user = await User.findById(userId);
  } catch (e) {
    throw new Error('Invalid User ID format.');
  }

  if (!user) throw new Error('User not found');

  const initialStatus = type?.toLowerCase() === 'cab' ? 'searching' : 'completed';

  const booking = await TravelBooking.create({
    user: userId,
    type,
    vehicleType,
    origin,
    destination,
    amount,
    status: initialStatus
  });

  await createNotification(
    userId,
    'Travel Booked',
    `Your ${type} booking from ${origin} to ${destination} was successful!`,
    'success'
  );

  return booking;
};

// Get all bookings for a user
export const getUserBookings = async (req: Request, res: Response) => {
  const { userId } = req.params;
  
  try {
    const bookings = await TravelBooking.find({ user: userId }).sort({ createdAt: -1 });
    res.json({ bookings });
  } catch (error) {
    console.error('Error fetching user bookings:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get all bookings for admin dashboard
export const getAllBookingsAdmin = async (req: Request, res: Response) => {
  try {
    const bookings = await TravelBooking.find().populate('user', 'name phone').sort({ createdAt: -1 });
    res.json({ bookings });
  } catch (error) {
    console.error('Error fetching all bookings:', error);
    res.status(500).json({ error: 'Server error' });
  }
};
