"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleAPEXPlanUpgrade = exports.saveFCMToken = exports.sendEmailNotification = exports.updateUserProfile = exports.getUserProfile = exports.exchangeFirebaseSession = void 0;
const User_1 = __importDefault(require("../models/User"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const auth_1 = require("firebase-admin/auth");
const resend_1 = require("resend");
const notificationController_1 = require("./notificationController");
const resend = new resend_1.Resend(process.env.RESEND_API_KEY || 'mock_key');
const publicProfile = (user) => ({
    _id: user._id, name: user.name, email: user.email, phone: user.phone,
    profilePicture: user.profilePicture, role: user.role, walletBalance: user.walletBalance,
    apexPlan: user.apexPlan, isPremium: user.apexPlan !== 'Free'
});
const exchangeFirebaseSession = async (req, res) => {
    const token = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null;
    if (!token)
        return res.status(401).json({ error: 'Verified phone login is required.' });
    try {
        const identity = await (0, auth_1.getAuth)().verifyIdToken(token, true);
        const phone = identity.phone_number;
        if (!phone || !/^\+91[6-9]\d{9}$/.test(phone))
            return res.status(403).json({ error: 'An Indian phone OTP login is required.' });
        let user = await User_1.default.findOne({ $or: [{ firebaseUid: identity.uid }, { phone }, { phone: phone.slice(3) }] });
        if (user?.firebaseUid && user.firebaseUid !== identity.uid)
            return res.status(403).json({ error: 'Account identity mismatch. Contact support.' });
        if (!user) {
            user = await User_1.default.create({ firebaseUid: identity.uid, phone, name: String(req.body?.name || 'APEX User').trim().slice(0, 100) || 'APEX User',
                email: `${phone.slice(1)}@apex.local`, role: 'user' });
        }
        else if (!user.firebaseUid) {
            user.firebaseUid = identity.uid;
            await user.save();
        }
        const session = jsonwebtoken_1.default.sign({ id: user._id, phone: user.phone, role: user.role, authVersion: 2 }, process.env.JWT_SECRET, { expiresIn: '1d' });
        return res.json({ user: publicProfile(user), token: session });
    }
    catch (error) {
        console.error('Session exchange failed:', error.code || error.message);
        return res.status(error.code?.startsWith('auth/') ? 401 : 503).json({ error: 'Unable to verify login. Please retry.' });
    }
};
exports.exchangeFirebaseSession = exchangeFirebaseSession;
const getUserProfile = async (req, res) => {
    try {
        const user = await User_1.default.findById(req.user?.id);
        if (!user)
            return res.status(404).json({ error: 'User not found' });
        return res.json(publicProfile(user));
    }
    catch {
        return res.status(500).json({ error: 'Unable to load profile.' });
    }
};
exports.getUserProfile = getUserProfile;
const updateUserProfile = async (req, res) => {
    try {
        const user = await User_1.default.findById(req.user?.id);
        if (!user)
            return res.status(404).json({ error: 'User not found' });
        const { name, email, profilePicture } = req.body;
        if (name !== undefined) {
            if (typeof name !== 'string' || name.trim().length < 2 || name.length > 100)
                return res.status(400).json({ error: 'Enter a valid name.' });
            user.name = name.trim();
        }
        if (email !== undefined) {
            if (typeof email !== 'string' || email.length > 254 || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)))
                return res.status(400).json({ error: 'Enter a valid email.' });
            user.email = email.trim() || `${String(user.phone).replace(/\D/g, '')}@apex.local`;
        }
        if (profilePicture !== undefined) {
            if (typeof profilePicture !== 'string' || profilePicture.length > 2000000)
                return res.status(400).json({ error: 'Invalid profile picture.' });
            user.profilePicture = profilePicture;
        }
        await user.save();
        return res.json({ user: publicProfile(user), message: 'Profile updated.' });
    }
    catch {
        return res.status(500).json({ error: 'Unable to update profile.' });
    }
};
exports.updateUserProfile = updateUserProfile;
const sendEmailNotification = async (req, res) => {
    const { to, subject, html } = req.body;
    if (!to || !subject || !html) {
        return res.status(400).json({ error: "Missing email parameters" });
    }
    if (!process.env.RESEND_API_KEY) {
        return res.status(500).json({ error: "Email service configuration missing" });
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
    const { token } = req.body;
    if (typeof token !== 'string' || !token || token.length > 4096) {
        return res.status(400).json({ error: "Valid FCM token required" });
    }
    try {
        const user = await User_1.default.findById(req.user.id);
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
