"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifySimulatedOTP = exports.loginSimulatedOTP = void 0;
const User_1 = __importDefault(require("../models/User"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
// In-memory store for development only
const otpStore = new Map();
const loginSimulatedOTP = async (req, res) => {
    const { phone } = req.body;
    if (!phone) {
        return res.status(400).json({ error: 'Phone number is required' });
    }
    // Generate a random 4-digit OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    otpStore.set(phone, otp);
    // Print to console (Simulated SMS)
    console.log(`\n========================================`);
    console.log(`📱 SMS TO: ${phone}`);
    console.log(`🔒 APEX Login Code: ${otp}`);
    console.log(`========================================\n`);
    res.status(200).json({ message: 'OTP sent successfully (check server console)' });
};
exports.loginSimulatedOTP = loginSimulatedOTP;
const verifySimulatedOTP = async (req, res) => {
    const { phone, otp } = req.body;
    if (!phone || !otp) {
        return res.status(400).json({ error: 'Phone and OTP are required' });
    }
    const storedOtp = otpStore.get(phone);
    if (storedOtp !== otp) {
        return res.status(401).json({ error: 'Invalid or expired OTP' });
    }
    // OTP is valid. Clear it.
    otpStore.delete(phone);
    try {
        // Find or create user
        let user = await User_1.default.findOne({ phone });
        const isAdminPhone = phone === '7032709656' || phone === '+917032709656';
        if (!user) {
            user = await User_1.default.create({
                phone,
                name: isAdminPhone ? 'APEX Admin' : 'New APEX User',
                email: `${phone}@apex.local`, // Dummy email
                walletBalance: 0,
                role: isAdminPhone ? 'admin' : 'user'
            });
        }
        else if (isAdminPhone && user.role !== 'admin') {
            // Automatically upgrade existing user to admin if phone matches
            user.role = 'admin';
            await user.save();
        }
        // Generate JWT
        const token = jsonwebtoken_1.default.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '30d' });
        res.status(200).json({
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                name: user.name,
                phone: user.phone,
                email: user.email,
                walletBalance: user.walletBalance,
                role: user.role
            }
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error during login' });
    }
};
exports.verifySimulatedOTP = verifySimulatedOTP;
