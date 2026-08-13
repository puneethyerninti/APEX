"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllBookingsAdmin = exports.getUserBookings = exports.createBooking = void 0;
const TravelBooking_1 = __importDefault(require("../models/TravelBooking"));
const User_1 = __importDefault(require("../models/User"));
const notificationController_1 = require("./notificationController");
// Create a new travel booking
const createBooking = async (req, res) => {
    const { userId, type, vehicleType, origin, destination, amount } = req.body;
    try {
        let user;
        try {
            user = await User_1.default.findById(userId);
        }
        catch (e) {
            // If CastError happens (e.g. userId is firebase uid), we try to find by some fallback or just fail gracefully
            return res.status(404).json({ error: 'Invalid User ID format. Please log out and log in again.' });
        }
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        // Wallet deduction and transaction creation removed as per request
        // Determine initial status based on type
        const initialStatus = type.toLowerCase() === 'cab' ? 'searching' : 'completed';
        // Create booking
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
        res.json({ success: true, booking, message: 'Booking successful' });
    }
    catch (error) {
        console.error('Error creating travel booking:', error);
        res.status(500).json({ error: 'Server error creating booking' });
    }
};
exports.createBooking = createBooking;
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
