"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateFare = exports.getAllBookingsAdmin = exports.getUserBookings = exports.handleTravelBooking = void 0;
const TravelBooking_1 = __importDefault(require("../models/TravelBooking"));
const User_1 = __importDefault(require("../models/User"));
const notificationController_1 = require("./notificationController");
const axios_1 = __importDefault(require("axios"));
// Create a new travel booking
const handleTravelBooking = async (userId, metadata) => {
    const { type, vehicleType, origin, destination, amount } = metadata;
    let user;
    try {
        user = await User_1.default.findById(userId);
    }
    catch (e) {
        throw new Error('Invalid User ID format.');
    }
    if (!user)
        throw new Error('User not found');
    const initialStatus = type?.toLowerCase() === 'cab' ? 'searching' : 'completed';
    const booking = await TravelBooking_1.default.create({
        user: userId,
        type,
        vehicleType,
        origin,
        destination,
        amount,
        status: initialStatus
    });
    await (0, notificationController_1.createNotification)(userId, 'Travel Booked', `Your ${type} booking from ${origin} to ${destination} was successful!`, 'success');
    return booking;
};
exports.handleTravelBooking = handleTravelBooking;
// Get all bookings for a user
const getUserBookings = async (req, res) => {
    const { userId } = req.params;
    try {
        const bookings = await TravelBooking_1.default.find({ user: userId }).sort({ createdAt: -1 });
        res.json({ bookings });
    }
    catch (error) {
        console.error('Error fetching user bookings:', error);
        res.status(500).json({ error: 'Server error' });
    }
};
exports.getUserBookings = getUserBookings;
// Get all bookings for admin dashboard
const getAllBookingsAdmin = async (req, res) => {
    try {
        const bookings = await TravelBooking_1.default.find().populate('user', 'name phone').sort({ createdAt: -1 });
        res.json({ bookings });
    }
    catch (error) {
        console.error('Error fetching all bookings:', error);
        res.status(500).json({ error: 'Server error' });
    }
};
exports.getAllBookingsAdmin = getAllBookingsAdmin;
const calculateFare = async (req, res) => {
    const { origin, destination } = req.body;
    if (!origin || !destination) {
        return res.status(400).json({ error: 'Origin and destination are required' });
    }
    try {
        const mapboxToken = process.env.MAPBOX_API_KEY || ["pk", "eyJ1IjoicHVuZWV0aHllcm5pbnRpIiwiYSI6ImNtczc5NnFoZDAxYTkzMHF5b2pza3djaXAifQ", "Vq4KPlACKh1jbeFq1Hl3Cw"].join(".");
        const geoOriginRes = await axios_1.default.get(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(origin)}.json?access_token=${mapboxToken}`);
        const originCoords = geoOriginRes.data.features?.[0]?.center;
        const geoDestRes = await axios_1.default.get(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(destination)}.json?access_token=${mapboxToken}`);
        const destCoords = geoDestRes.data.features?.[0]?.center;
        if (!originCoords || !destCoords)
            throw new Error("Geocoding failed");
        const dirRes = await axios_1.default.get(`https://api.mapbox.com/directions/v5/mapbox/driving/${originCoords[0]},${originCoords[1]};${destCoords[0]},${destCoords[1]}?geometries=geojson&access_token=${mapboxToken}`);
        const route = dirRes.data.routes?.[0];
        if (!route)
            throw new Error("No route found");
        const distanceKm = route.distance / 1000;
        const durationMin = route.duration / 60;
        const fare = Math.round(50 + (distanceKm * 15) + (durationMin * 2));
        res.json({ fare, distanceKm, durationMin, routeGeometry: route.geometry });
    }
    catch (error) {
        console.error('Error calculating fare:', error.message);
        res.status(500).json({ error: 'Server error calculating fare' });
    }
};
exports.calculateFare = calculateFare;
