"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleAPEXPlanUpgrade = exports.saveFCMToken = exports.sendEmailNotification = exports.updateUserProfile = exports.logoutSession = exports.getUserProfile = exports.exchangeFirebaseSession = void 0;
const User_1 = __importDefault(require("../models/User"));
const AuthSession_1 = __importDefault(require("../models/AuthSession"));
const authSession_1 = require("../services/authSession");
const socketManager_1 = require("../utils/socketManager");
const auth_1 = require("firebase-admin/auth");
const resend_1 = require("resend");
const notificationController_1 = require("./notificationController");
const resend = new resend_1.Resend(process.env.RESEND_API_KEY || 'mock_key');
const publicProfile = (user) => ({
    _id: user._id, name: user.name, email: user.email?.endsWith('@apex.local') ? '' : user.email, phone: user.phone,
    profilePicture: user.profilePicture, role: user.role, walletBalance: user.walletBalance,
    apexPlan: user.apexPlan, isPremium: user.apexPlan !== 'Free'
});
const exchangeFirebaseSession = async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const token = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null;
    if (!token)
        return res.status(401).json({ error: 'Verified phone login is required.' });
    let stage = 'firebase_verification';
    try {
        const identity = await (0, auth_1.getAuth)().verifyIdToken(token, true);
        const phone = identity.phone_number;
        if (!phone || !/^\+91[6-9]\d{9}$/.test(phone) || identity.firebase?.sign_in_provider !== 'phone')
            return res.status(403).json({ error: 'An Indian phone OTP login is required.' });
        stage = 'account_lookup';
        const matches = await User_1.default.find({ $or: [{ firebaseUid: identity.uid }, { phone }, { phone: phone.slice(3) }] }).limit(2);
        if (matches.length > 1)
            return res.status(409).json({ error: 'Account needs verification by support.' });
        let user = matches[0];
        if (user && ((user.firebaseUid && user.firebaseUid !== identity.uid) || (user.phone && user.phone !== phone && user.phone !== phone.slice(3))))
            return res.status(403).json({ error: 'Account identity mismatch. Contact support.' });
        if (user?.isDisabled)
            return res.status(403).json({ error: 'Account access is unavailable. Contact support.' });
        if (req.body?.intent === 'admin' && user?.role !== 'admin')
            return res.status(403).json({ error: 'Access denied. Admin only.' });
        if (!user) {
            if (req.body?.name === undefined)
                return res.json({ registrationRequired: true, phone });
            const name = req.body.name;
            if (typeof name !== 'string' || name.trim().length < 2 || name.length > 100 || /[\x00-\x1f\x7f]/.test(name))
                return res.status(400).json({ error: 'Enter your full name (2 to 100 characters).' });
            if (!identity.auth_time || Date.now() / 1000 - identity.auth_time > 900 || identity.auth_time > Date.now() / 1000 + 60)
                return res.status(401).json({ error: 'Verify your phone again to create an account.' });
            try {
                user = await User_1.default.create({ firebaseUid: identity.uid, phone, name: name.trim(), email: `${phone.slice(1)}@apex.local`, role: 'user' });
            }
            catch (error) {
                if (error.code !== 11000)
                    throw error;
                user = (await User_1.default.findOne({ firebaseUid: identity.uid, phone }));
                if (!user || user.isDisabled)
                    return res.status(409).json({ error: 'Account needs verification by support.' });
            }
        }
        else if (!user.firebaseUid) {
            // Claim legacy accounts atomically; never overwrite another Firebase identity.
            user = (await User_1.default.findOneAndUpdate({ _id: user._id, $or: [{ firebaseUid: { $exists: false } }, { firebaseUid: null }] }, { $set: { firebaseUid: identity.uid } }, { new: true }));
            if (!user)
                return res.status(409).json({ error: 'Account changed. Please sign in again.' });
        }
        stage = 'session_signing';
        const session = await (0, authSession_1.issueApplicationSession)(user);
        return res.json({ user: publicProfile(user), token: session });
    }
    catch (error) {
        console.error('Session exchange failed:', 'stage=' + stage, 'code=' + (error.code || error.name || 'unknown'));
        const invalidToken = ['auth/argument-error', 'auth/invalid-id-token', 'auth/id-token-expired', 'auth/id-token-revoked', 'auth/user-disabled', 'auth/user-not-found'].includes(error.code);
        const configurationError = stage === 'session_signing' || error.code?.startsWith('app/') || ['auth/invalid-credential', 'auth/insufficient-permission'].includes(error.code);
        return res.status(invalidToken ? 401 : 503).json({
            code: invalidToken ? 'LOGIN_EXPIRED' : configurationError ? 'LOGIN_CONFIGURATION_ERROR' : 'LOGIN_SERVICE_UNAVAILABLE',
            error: invalidToken ? 'Your sign-in has expired. Please sign in again.' : configurationError ? 'Server sign-in configuration needs to be corrected.' : 'Sign-in service is temporarily unavailable.'
        });
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
const logoutSession = async (req, res) => {
    try {
        const identity = req.user;
        await AuthSession_1.default.deleteOne({ tokenId: identity.tokenId, userId: identity.id });
        if (typeof req.body?.fcmToken === 'string' && req.body.fcmToken.length <= 4096) {
            await User_1.default.updateOne({ _id: identity.id }, { $pull: { fcmTokens: req.body.fcmToken } });
        }
        try {
            (0, socketManager_1.getIO)().in(`session_${identity.tokenId}`).disconnectSockets(true);
        }
        catch { /* HTTP-only processes have no socket server. */ }
        return res.json({ success: true });
    }
    catch {
        return res.status(503).json({ error: 'Unable to revoke session. Please retry.' });
    }
};
exports.logoutSession = logoutSession;
const updateUserProfile = async (req, res) => {
    try {
        const user = await User_1.default.findById(req.user?.id);
        if (!user)
            return res.status(404).json({ error: 'User not found' });
        const { name, email, profilePicture } = req.body;
        if (name !== undefined) {
            if (typeof name !== 'string' || name.trim().length < 2 || name.length > 100 || /[\x00-\x1f\x7f]/.test(name))
                return res.status(400).json({ error: 'Enter a valid name.' });
            user.name = name.trim();
        }
        if (email !== undefined) {
            if (typeof email !== 'string' || email.length > 254 || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)))
                return res.status(400).json({ error: 'Enter a valid email.' });
            user.email = email.trim() || `${String(user.phone).replace(/\D/g, '')}@apex.local`;
        }
        if (profilePicture !== undefined) {
            if (typeof profilePicture !== 'string' || profilePicture.length > 2000000 || (profilePicture && !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(profilePicture)))
                return res.status(400).json({ error: 'Choose a JPEG, PNG or WebP profile picture.' });
            user.profilePicture = profilePicture;
        }
        await user.save();
        return res.json({ user: publicProfile(user), message: 'Profile updated.' });
    }
    catch (error) {
        if (error.code === 11000)
            return res.status(409).json({ error: 'That email is already linked to another account.' });
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
            // A shared device must not continue receiving another account's private notifications.
            await User_1.default.updateMany({ _id: { $ne: user._id }, fcmTokens: token }, { $pull: { fcmTokens: token } });
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
