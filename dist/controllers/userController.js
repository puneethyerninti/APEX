"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleAPEXPlanUpgrade = exports.saveFCMToken = exports.sendEmailNotification = exports.updateUserProfile = exports.getUserProfile = void 0;
const User_1 = __importDefault(require("../models/User"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const resend_1 = require("resend");
const notificationController_1 = require("./notificationController");
const resend = new resend_1.Resend(process.env.RESEND_API_KEY || 'mock_key');
const getUserProfile = async (req, res) => {
    const { phone } = req.query;
    if (!phone) {
        return res.status(400).json({ error: 'Phone number is required' });
    }
    try {
        const user = await User_1.default.findOne({ phone: phone });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        const isAdminPhone = phone === '8247885289' || phone === '+918247885289';
        if (isAdminPhone && user.role !== 'admin') {
            user.role = 'admin';
            await user.save();
        }
        const token = jsonwebtoken_1.default.sign({ id: user._id, phone: user.phone, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            profilePicture: user.profilePicture,
            role: user.role,
            walletBalance: user.walletBalance,
            token,
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error fetching user profile' });
    }
};
exports.getUserProfile = getUserProfile;
const updateUserProfile = async (req, res) => {
    const { phone, name, email, profilePicture } = req.body;
    if (!phone) {
        return res.status(400).json({ error: 'Phone number is required' });
    }
    try {
        let user = await User_1.default.findOne({ phone });
        const isAdminPhone = phone === '8247885289' || phone === '+918247885289';
        if (user) {
            // Update existing user
            if (name !== undefined)
                user.name = name;
            if (email !== undefined)
                user.email = email;
            if (profilePicture !== undefined)
                user.profilePicture = profilePicture;
            if (isAdminPhone && user.role !== 'admin') {
                user.role = 'admin'; // Auto-upgrade to admin
            }
            await user.save();
            // Send real-time push notification for manual testing!
            await (0, notificationController_1.createNotification)(user._id.toString(), "Profile Updated ✅", "Your profile details were updated successfully. Push notifications are working!", "success");
        }
        else {
            // Create user if not found (fallback)
            user = await User_1.default.create({
                phone,
                name: name || (isAdminPhone ? 'APEX Admin' : 'User'),
                email: email || `${phone}@apex.local`,
                walletBalance: 0,
                role: isAdminPhone ? 'admin' : 'user'
            });
            // Emit live event to admin dashboard
            const io = req.app.get('io');
            if (io) {
                io.to('admin_room').emit('admin_data_refresh');
            }
        }
        const token = jsonwebtoken_1.default.sign({ id: user._id, phone: user.phone, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.json({
            message: 'Profile updated successfully',
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                profilePicture: user.profilePicture,
                role: user.role,
                walletBalance: user.walletBalance
            },
            token
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error updating profile' });
    }
};
exports.updateUserProfile = updateUserProfile;
// Resend Email Notification (Hybrid Mock)
const sendEmailNotification = async (req, res) => {
    const { to, subject, html } = req.body;
    if (!to || !subject || !html) {
        return res.status(400).json({ error: "Missing email parameters" });
    }
    // MOCK BYPASS
    if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === 'mock_key') {
        console.log("=== MOCK EMAIL DISPATCHED ===");
        console.log(`To: ${to}`);
        console.log(`Subject: ${subject}`);
        console.log(`HTML Length: ${html.length} chars`);
        console.log("=============================");
        return res.json({
            success: true,
            mockMode: true,
            message: "Email dispatched via Mock Service"
        });
    }
    // REAL RESEND DISPATCH
    try {
        const data = await resend.emails.send({
            from: 'APEX Corporation <onboarding@resend.dev>', // default resend sandbox domain
            to,
            subject,
            html
        });
        res.json({ success: true, mockMode: false, data });
    }
    catch (error) {
        console.error("Resend API Error:", error);
        res.status(500).json({ error: "Failed to send email" });
    }
};
exports.sendEmailNotification = sendEmailNotification;
const saveFCMToken = async (req, res) => {
    const { phone, token } = req.body;
    if (!phone || !token) {
        return res.status(400).json({ error: "Phone number and FCM token are required" });
    }
    try {
        const user = await User_1.default.findOne({ phone });
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        if (!user.fcmTokens) {
            user.fcmTokens = [];
        }
        if (!user.fcmTokens.includes(token)) {
            user.fcmTokens.push(token);
            await user.save();
        }
        res.json({ success: true, message: "FCM token saved successfully" });
    }
    catch (error) {
        console.error("Error saving FCM token:", error);
        res.status(500).json({ error: "Server error saving FCM token" });
    }
};
exports.saveFCMToken = saveFCMToken;
const handleAPEXPlanUpgrade = async (userId, plan) => {
    if (!userId || !plan)
        throw new Error("User ID and plan are required");
    const user = await User_1.default.findById(userId);
    if (!user)
        throw new Error("User not found");
    user.apexPlan = plan;
    await user.save();
    await (0, notificationController_1.createNotification)(userId, 'Subscription Upgraded', `Welcome to ${plan}! You now have exclusive access to premium features.`, 'success');
    return user;
};
exports.handleAPEXPlanUpgrade = handleAPEXPlanUpgrade;
