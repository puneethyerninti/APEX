"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllBookingsAdmin = exports.getUserBookings = exports.handleTravelBooking = void 0;
const TravelBooking_1 = __importDefault(require("../models/TravelBooking"));
const User_1 = __importDefault(require("../models/User"));
const notificationController_1 = require("./notificationController");
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
