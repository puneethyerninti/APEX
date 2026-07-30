import { Request, Response } from 'express';
import TravelBooking from '../models/TravelBooking';
import User from '../models/User';
import Transaction from '../models/Transaction';

// Create a new travel booking
export const createBooking = async (req: Request, res: Response) => {
  const { userId, type, vehicleType, origin, destination, amount } = req.body;

  try {
    let user;
    try {
      user = await User.findById(userId);
    } catch (e) {
      // If CastError happens (e.g. userId is firebase uid), we try to find by some fallback or just fail gracefully
      return res.status(404).json({ error: 'Invalid User ID format. Please log out and log in again.' });
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.walletBalance < amount) {
      // For demo purposes, if they don't have enough balance, auto-fund them so they can test the real-time feature
      user.walletBalance += 5000;
      console.log(`Auto-funded wallet for user ${user.name} to test Travels feature.`);
    }

    // Deduct from wallet
    user.walletBalance -= amount;
    await user.save();

    // Create a transaction record
    await Transaction.create({
      user: user._id,
      amount: -amount,
      type: 'debit',
      description: `Travel booking: ${type} from ${origin} to ${destination}`,
      status: 'completed'
    });

    // Determine initial status based on type
    const initialStatus = type.toLowerCase() === 'cab' ? 'searching' : 'completed';

    // Create booking
    const booking = await TravelBooking.create({
      user: userId,
      type,
      vehicleType,
      origin,
      destination,
      amount,
      status: initialStatus
    });

    res.json({ success: true, booking, message: 'Booking successful' });
  } catch (error) {
    console.error('Error creating travel booking:', error);
    res.status(500).json({ error: 'Server error creating booking' });
  }
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
