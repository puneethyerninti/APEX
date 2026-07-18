import { Request, Response } from 'express';
import { Resend } from 'resend';
import User from '../models/User';

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
      id: data.id
    });
  } catch (error: any) {
    console.error("Resend API Error:", error.message);
    res.status(500).json({ error: "Failed to send email" });
  }
};
