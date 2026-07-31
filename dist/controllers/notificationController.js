"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.markAllAsRead = exports.markAsRead = exports.getUserNotifications = exports.sendEmailNotification = void 0;
const resend_1 = require("resend");
const Notification_1 = __importDefault(require("../models/Notification"));
// Initialize Resend
// Note: Fallback if API key is not provided yet
const resend = process.env.RESEND_API_KEY ? new resend_1.Resend(process.env.RESEND_API_KEY) : null;
const sendEmailNotification = async (req, res) => {
    const { to, subject, html } = req.body;
    if (!resend) {
        console.warn("⚠️ RESEND API KEY MISSING: Simulating Email send.");
        // Simulate delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        return res.json({
            message: "Email sent successfully (Simulated)",
            id: `sim_email_${Date.now()}`
        });
    }
    try {
        const data = await resend.emails.send({
            from: 'Apex Updates <onboarding@resend.dev>', // Resend test domain
            to,
            subject,
            html
        });
        res.json({
            message: "Email sent successfully",
            id: data.data?.id || data.id
        });
    }
    catch (error) {
        console.error("Resend API Error:", error.message);
        res.status(500).json({ error: "Failed to send email" });
    }
};
exports.sendEmailNotification = sendEmailNotification;
const getUserNotifications = async (req, res) => {
    const { userId } = req.params;
    try {
        const notifications = await Notification_1.default.find({ user: userId })
            .sort({ createdAt: -1 })
            .limit(50);
        res.json({ notifications });
    }
    catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ error: 'Server error' });
    }
};
exports.getUserNotifications = getUserNotifications;
const markAsRead = async (req, res) => {
    const { id } = req.params;
    try {
        const notification = await Notification_1.default.findByIdAndUpdate(id, { isRead: true }, { new: true });
        res.json({ success: true, notification });
    }
    catch (error) {
        console.error('Error marking notification read:', error);
        res.status(500).json({ error: 'Server error' });
    }
};
exports.markAsRead = markAsRead;
const markAllAsRead = async (req, res) => {
    const { userId } = req.body;
    if (!userId)
        return res.status(400).json({ error: 'userId is required' });
    try {
        await Notification_1.default.updateMany({ user: userId, isRead: false }, { $set: { isRead: true } });
        res.json({ success: true, message: 'All marked as read' });
    }
    catch (error) {
        console.error('Error marking all notifications read:', error);
        res.status(500).json({ error: 'Server error' });
    }
};
exports.markAllAsRead = markAllAsRead;
