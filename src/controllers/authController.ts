import { Request, Response } from 'express';
import User from '../models/User';
import jwt from 'jsonwebtoken';

// In-memory store for development only
const otpStore = new Map<string, string>();

export const loginSimulatedOTP = async (req: Request, res: Response) => {
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

export const verifySimulatedOTP = async (req: Request, res: Response) => {
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
      let user = await User.findOne({ phone });
      
      const isAdminPhone = phone === '7032709656' || phone === '+917032709656';
      
      if (!user) {
        user = await User.create({
          phone,
          name: isAdminPhone ? 'APEX Admin' : 'New APEX User',
          email: `${phone}@apex.local`, // Dummy email
          walletBalance: 0,
          role: isAdminPhone ? 'admin' : 'user'
        });
      } else if (isAdminPhone && user.role !== 'admin') {
        // Automatically upgrade existing user to admin if phone matches
        user.role = 'admin';
        await user.save();
      }

    // Generate JWT
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET as string,
      { expiresIn: '30d' }
    );

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
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error during login' });
  }
};
