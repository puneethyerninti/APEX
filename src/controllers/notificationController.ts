import { Request, Response } from 'express';
import { Resend } from 'resend';
import User from '../models/User';
import Notification from '../models/Notification';

// Initialize Resend
// Note: Fallback if API key is not provided yet
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export const sendEmailNotification = async (req: Request, res: Response) => {
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
      id: data.data?.id || (data as any).id
    });
  } catch (error: any) {
    console.error("Resend API Error:", error.message);
    res.status(500).json({ error: "Failed to send email" });
  }
};

export const getUserNotifications = async (req: Request, res: Response) => {
  const { userId } = req.params;
  try {
    const notifications = await Notification.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json({ notifications });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const markAsRead = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const notification = await Notification.findByIdAndUpdate(
      id,
      { isRead: true },
      { new: true }
    );
    res.json({ success: true, notification });
  } catch (error) {
    console.error('Error marking notification read:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const markAllAsRead = async (req: Request, res: Response) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId is required' });

  try {
    await Notification.updateMany(
      { user: userId, isRead: false },
      { $set: { isRead: true } }
    );
    res.json({ success: true, message: 'All marked as read' });
  } catch (error) {
    console.error('Error marking all notifications read:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

import { sendPushNotification } from '../firebaseAdmin';

export const createNotification = async (userId: string, title: string, message: string, type: string = 'info') => {
  try {
    const notification = await Notification.create({
      user: userId,
      title,
      message,
      type
    });

    const user = await User.findById(userId);
    if (user && user.fcmTokens && user.fcmTokens.length > 0) {
      await sendPushNotification(user.fcmTokens, title, message, { notificationId: notification._id.toString() });
    }

    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
};
