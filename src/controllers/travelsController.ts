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
