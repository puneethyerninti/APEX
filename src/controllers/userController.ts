import { Request, Response } from 'express';
import User from '../models/User';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import { Resend } from 'resend';

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

// Cashfree Identity Verification (Hybrid Mock)
export const verifyPan = async (req: Request, res: Response) => {
  const { pan_number, name } = req.body;

  if (!pan_number) {
    return res.status(400).json({ error: "PAN number is required" });
  }

  // MOCK BYPASS
  if (!process.env.CASHFREE_CLIENT_ID) {
    return res.json({
      success: true,
      mockMode: true,
      message: "PAN successfully verified (Mock Mode)",
      data: {
        pan: pan_number,
        name_provided: name,
        registered_name: "Mocked User Identity",
        valid: true
      }
    });
  }

  // REAL CASHFREE VERIFICATION
  try {
    const environment = process.env.CASHFREE_ENVIRONMENT === 'PRODUCTION' 
      ? 'https://api.cashfree.com/verification' 
      : 'https://sandbox.cashfree.com/verification';

    const response = await axios.post(`${environment}/pan`, {
      pan: pan_number,
      name: name || ""
    }, {
      headers: {
        'x-client-id': process.env.CASHFREE_CLIENT_ID,
        'x-client-secret': process.env.CASHFREE_CLIENT_SECRET,
        'Content-Type': 'application/json'
      }
    });

    if (response.data.valid === true) {
      res.json({ success: true, mockMode: false, data: response.data });
    } else {
      res.status(400).json({ success: false, error: "Invalid PAN", data: response.data });
    }
  } catch (error: any) {
    console.error("Cashfree API Error:", error?.response?.data || error);
    res.status(500).json({ error: "Failed to verify identity with provider" });
  }
};

// Resend Email Notification (Hybrid Mock)
export const sendEmailNotification = async (req: Request, res: Response) => {
  const { to, subject, html } = req.body;

  if (!to || !subject || !html) {
    return res.status(400).json({ error: "Missing email parameters" });
  }

  // MOCK BYPASS
  if (!process.env.RESEND_API_KEY) {
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
