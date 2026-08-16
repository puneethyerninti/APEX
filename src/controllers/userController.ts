import { Request, Response } from 'express';
import User from '../models/User';
import Transaction from '../models/Transaction';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import { Resend } from 'resend';
import { createNotification } from './notificationController';

const resend = new Resend(process.env.RESEND_API_KEY || 'mock_key');

export const getUserProfile = async (req: Request, res: Response) => {
  const { phone } = req.query;

  if (!phone) {
    return res.status(400).json({ error: 'Phone number is required' });
  }

  try {
    const user = await User.findOne({ phone: phone as string });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isAdminPhone = phone === '8247885289' || phone === '+918247885289';
    if (isAdminPhone && user.role !== 'admin') {
        user.role = 'admin';
        await user.save();
    }

    const token = jwt.sign(
      { id: user._id, phone: user.phone, role: user.role },
      process.env.JWT_SECRET as string,
      { expiresIn: '7d' }
    );

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
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error fetching user profile' });
  }
};

export const updateUserProfile = async (req: Request, res: Response) => {
  const { phone, name, email, profilePicture } = req.body;

  if (!phone) {
    return res.status(400).json({ error: 'Phone number is required' });
  }

  try {
    let user = await User.findOne({ phone });
    
    const isAdminPhone = phone === '8247885289' || phone === '+918247885289';
    
    if (user) {
      // Update existing user
      if (name !== undefined) user.name = name;
      if (email !== undefined) user.email = email;
      if (profilePicture !== undefined) user.profilePicture = profilePicture;
      if (isAdminPhone && user.role !== 'admin') {
          user.role = 'admin'; // Auto-upgrade to admin
      }
      await user.save();
      
      // Send real-time push notification for manual testing!
      await createNotification(
        user._id.toString(),
        "Profile Updated ✅",
        "Your profile details were updated successfully. Push notifications are working!",
        "success"
      );
    } else {
      // Create user if not found (fallback)
      user = await User.create({
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

    const token = jwt.sign(
      { id: user._id, phone: user.phone, role: user.role },
      process.env.JWT_SECRET as string,
      { expiresIn: '7d' }
    );

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
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error updating profile' });
  }
};


// Resend Email Notification (Hybrid Mock)
export const sendEmailNotification = async (req: Request, res: Response) => {
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
  } catch (error) {
    console.error("Resend API Error:", error);
    res.status(500).json({ error: "Failed to send email" });
  }
};

export const saveFCMToken = async (req: Request, res: Response) => {
  const { phone, token } = req.body;

  if (!phone || !token) {
    return res.status(400).json({ error: "Phone number and FCM token are required" });
  }

  try {
    const user = await User.findOne({ phone });
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

export const upgradeUserPlan = async (req: Request, res: Response) => {
  const { userId, plan } = req.body;
  if (!userId || !plan) {
    return res.status(400).json({ error: "User ID and plan are required" });
  }

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    user.apexPlan = plan;
    await user.save();

    await Transaction.create({
      user: userId,
      type: 'debit',
      amount: plan === 'APEX Prime' ? 2999 : (plan === 'APEX Plus' ? 999 : 0),
      category: `Purchased ${plan}`,
      status: 'completed'
    } as any);

    await createNotification(
      userId,
      'Subscription Upgraded',
      `Welcome to ${plan}! You now have exclusive access to premium features.`,
      'success'
    );

    res.json({ success: true, message: `Successfully upgraded to ${plan}`, user });
  } catch (error) {
    console.error("Error upgrading user plan:", error);
    res.status(500).json({ error: "Server error upgrading plan" });
  }
};
