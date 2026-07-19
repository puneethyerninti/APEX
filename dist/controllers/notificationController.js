"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmailNotification = void 0;
const resend_1 = require("resend");
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
