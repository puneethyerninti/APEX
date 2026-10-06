import { Request, Response } from 'express';
import User from '../models/User';
import Transaction from '../models/Transaction';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import { getAuth } from 'firebase-admin/auth';
import { Resend } from 'resend';
import { createNotification } from './notificationController';

const resend = new Resend(process.env.RESEND_API_KEY || 'mock_key');

const publicProfile = (user: any) => ({
  _id: user._id, name: user.name, email: user.email, phone: user.phone,
  profilePicture: user.profilePicture, role: user.role, walletBalance: user.walletBalance,
  apexPlan: user.apexPlan, isPremium: user.apexPlan !== 'Free'
});

export const exchangeFirebaseSession = async (req: Request, res: Response) => {
  const token = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Verified phone login is required.' });
  try {
    const identity = await getAuth().verifyIdToken(token, true);
    const phone = identity.phone_number;
    if (!phone || !/^\+91[6-9]\d{9}$/.test(phone)) return res.status(403).json({ error: 'An Indian phone OTP login is required.' });
    let user = await User.findOne({ $or: [{ firebaseUid: identity.uid }, { phone }, { phone: phone.slice(3) }] });
    if (user?.firebaseUid && user.firebaseUid !== identity.uid) return res.status(403).json({ error: 'Account identity mismatch. Contact support.' });
    if (!user) {
      user = await User.create({ firebaseUid: identity.uid, phone, name: String(req.body?.name || 'APEX User').trim().slice(0, 100) || 'APEX User',
        email: `${phone.slice(1)}@apex.local`, role: 'user' });
    } else if (!user.firebaseUid) {
      user.firebaseUid = identity.uid;
      await user.save();
    }
    const session = jwt.sign({ id: user._id, phone: user.phone, role: user.role, authVersion: 2 },
      process.env.JWT_SECRET as string, { expiresIn: '1d' });
    return res.json({ user: publicProfile(user), token: session });
  } catch (error: any) {
    console.error('Session exchange failed:', error.code || error.message);
    return res.status(error.code?.startsWith('auth/') ? 401 : 503).json({ error: 'Unable to verify login. Please retry.' });
  }
};

export const getUserProfile = async (req: Request, res: Response) => {
  try {
    const user = await User.findById((req as any).user?.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json(publicProfile(user));
  } catch {
    return res.status(500).json({ error: 'Unable to load profile.' });
  }
};

export const updateUserProfile = async (req: Request, res: Response) => {
  try {
    const user = await User.findById((req as any).user?.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const { name, email, profilePicture } = req.body;
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length < 2 || name.length > 100) return res.status(400).json({ error: 'Enter a valid name.' });
      user.name = name.trim();
    }
    if (email !== undefined) {
      if (typeof email !== 'string' || email.length > 254 || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) return res.status(400).json({ error: 'Enter a valid email.' });
      user.email = email.trim() || `${String(user.phone).replace(/\D/g, '')}@apex.local`;
    }
    if (profilePicture !== undefined) {
      if (typeof profilePicture !== 'string' || profilePicture.length > 2000000) return res.status(400).json({ error: 'Invalid profile picture.' });
      user.profilePicture = profilePicture;
    }
    await user.save();
    return res.json({ user: publicProfile(user), message: 'Profile updated.' });
  } catch {
    return res.status(500).json({ error: 'Unable to update profile.' });
  }
};
export const sendEmailNotification = async (req: Request, res: Response) => {
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
  } catch (error) {
    console.error("Resend API Error:", error);
    res.status(500).json({ error: "Failed to send email" });
  }
};

export const saveFCMToken = async (req: Request, res: Response) => {
  const { token } = req.body;

  if (typeof token !== 'string' || !token || token.length > 4096) {
    return res.status(400).json({ error: "Valid FCM token required" });
  }

  try {
    const user = await User.findById((req as any).user.id);
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
  } catch (error) {
    console.error("Error saving FCM token:", error);
    res.status(500).json({ error: "Server error saving FCM token" });
  }
};

export const handleAPEXPlanUpgrade = async (userId: string, plan: string) => {
  if (!userId || !plan) throw new Error("User ID and plan are required");

  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  user.apexPlan = plan as any;
  await user.save();

  await createNotification(
    userId,
    'Subscription Upgraded',
    `Welcome to ${plan}! You now have exclusive access to premium features.`,
    'success'
  );

  return user;
};
