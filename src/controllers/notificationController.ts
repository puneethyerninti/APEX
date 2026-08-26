import { Request, Response } from 'express';
import { Resend } from 'resend';
import User from '../models/User';
import Notification from '../models/Notification';
import { getIO } from '../utils/socketManager';

// Initialize Resend
// Note: Fallback if API key is not provided yet
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export const sendEmailNotification = async (req: Request, res: Response) => {
  const { to, subject, html } = req.body;

  if (!resend) {
    return res.status(500).json({ error: "Email service configuration missing" });
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

export const createNotification = async (userId: string, title: string, message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
  try {
    const notification = await Notification.create({
      user: userId,
      title,
      message,
      type
    });

    const user = await User.findById(userId);
    if (user && user.fcmTokens && user.fcmTokens.length > 0) {
      await sendPushNotification(user.fcmTokens, title, message, { notificationId: (notification as any)._id.toString() });
    }

    try {
      const io = getIO();
      if (io) {
        io.to(`user_${userId}`).emit('new_notification', notification);
      }
    } catch (ioErr) {
      console.error('Socket not initialized, could not emit live notification');
    }

    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
};
