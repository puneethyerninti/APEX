import { Request, Response } from 'express';
import TravelBooking from '../models/TravelBooking';
import User from '../models/User';
import Transaction from '../models/Transaction';
import { createNotification } from './notificationController';
import axios from 'axios';

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

export const calculateFare = async (req: Request, res: Response) => {
  const { origin, destination } = req.body;

  if (!origin || !destination) {
    return res.status(400).json({ error: 'Origin and destination are required' });
  }

  try {
    const mapboxToken = process.env.MAPBOX_API_KEY || ["pk", "eyJ1IjoicHVuZWV0aHllcm5pbnRpIiwiYSI6ImNtczc5NnFoZDAxYTkzMHF5b2pza3djaXAifQ", "Vq4KPlACKh1jbeFq1Hl3Cw"].join(".");
    
    const geoOriginRes = await axios.get(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(origin)}.json?access_token=${mapboxToken}`);
    const originCoords = geoOriginRes.data.features?.[0]?.center;

    const geoDestRes = await axios.get(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(destination)}.json?access_token=${mapboxToken}`);
    const destCoords = geoDestRes.data.features?.[0]?.center;

    if (!originCoords || !destCoords) throw new Error("Geocoding failed");

    const dirRes = await axios.get(`https://api.mapbox.com/directions/v5/mapbox/driving/${originCoords[0]},${originCoords[1]};${destCoords[0]},${destCoords[1]}?geometries=geojson&access_token=${mapboxToken}`);
    const route = dirRes.data.routes?.[0];
    
    if (!route) throw new Error("No route found");

    const distanceKm = route.distance / 1000;
    const durationMin = route.duration / 60;

    const fare = Math.round(50 + (distanceKm * 15) + (durationMin * 2));

    res.json({ fare, distanceKm, durationMin, routeGeometry: route.geometry });
  } catch (error: any) {
    console.error('Error calculating fare:', error.message);
    res.status(500).json({ error: 'Server error calculating fare' });
  }
};

// --- NEW RIDE APIs (Phase 3 Uber-style) ---
import Ride from '../models/Ride';

const resolveUser = async (req: Request) => {
  const userId = req.query.userId || req.body.userId || req.params.userId;
  if (!userId) return null;
  return User.findById(userId);
};

export const requestRide = async (req: Request, res: Response) => {
  try {
    const { pickup, dropoff, fare, distance, duration, path, userId } = req.body;
    
    if (!pickup || !dropoff || !fare) {
      return res.status(400).json({ success: false, error: 'Missing ride details' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const existingRide = await Ride.findOne({
      userId: user._id,
      status: { $in: ['searching', 'accepted', 'arrived', 'in_progress'] }
    });

    if (existingRide) {
      return res.status(400).json({ success: false, error: 'You already have an active ride' });
    }

    const newRide = await Ride.create({
      userId: user._id,
      pickup,
      dropoff,
      fare,
      distance,
      duration,
      path,
      status: 'searching'
    });

    const io = req.app.get('io');
    if (io) {
      io.to('driver_room').emit('new_ride_request', newRide);
    }

    return res.status(201).json({ success: true, ride: newRide });
  } catch (error) {
    console.error('requestRide error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

export const getActiveRide = async (req: Request, res: Response) => {
  try {
    const user = await resolveUser(req);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const ride = await Ride.findOne({
      $or: [{ userId: user._id }, { driverId: user._id }],
      status: { $in: ['searching', 'accepted', 'arrived', 'in_progress'] }
    }).populate('driverId', 'name phone vehicleDetails currentLocation profilePicture')
      .populate('userId', 'name phone profilePicture');

    return res.json({ success: true, ride });
  } catch (error) {
    console.error('getActiveRide error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

export const updateRideStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, driverId } = req.body;

    const ride = await Ride.findById(id);
    if (!ride) {
      return res.status(404).json({ success: false, error: 'Ride not found' });
    }

    if (status === 'accepted') {
      if (ride.status !== 'searching') {
        return res.status(400).json({ success: false, error: 'Ride already accepted by another driver' });
      }
      if (!driverId) {
        return res.status(400).json({ success: false, error: 'Driver ID required' });
      }
      ride.driverId = driverId;
    }

    ride.status = status;
    await ride.save();
    await ride.populate('driverId', 'name phone vehicleDetails currentLocation profilePicture');

    const io = req.app.get('io');
    if (io) {
      io.to(`user_${ride.userId}`).emit('ride_status_update', ride);
      if (status === 'accepted') {
         io.to('driver_room').emit('remove_ride_request', ride._id);
      }
    }

    return res.json({ success: true, ride });
  } catch (error) {
    console.error('updateRideStatus error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

export const updateDriverStatus = async (req: Request, res: Response) => {
  try {
    const { isOnline, lat, lng, heading } = req.body;
    const user = await resolveUser(req);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    if (user.role !== 'driver' && user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Not a driver' });
    }

    if (typeof isOnline === 'boolean') {
      user.isOnline = isOnline;
    }
    
    if (lat && lng) {
      user.currentLocation = {
        lat,
        lng,
        heading: heading || 0,
        updatedAt: new Date()
      };
    }

    await user.save();
    return res.json({ success: true, user });
  } catch (error) {
    console.error('updateDriverStatus error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};
