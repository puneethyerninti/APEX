import express from 'express';
import { exchangeFirebaseSession, logoutSession, getUserProfile, updateUserProfile, sendEmailNotification, saveFCMToken } from '../controllers/userController';
import rateLimit from 'express-rate-limit';
import { requireAuth, requireAdmin } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/session', rateLimit({ windowMs: 60000, max: 30, standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many sign-in attempts. Please wait a minute.' } }), exchangeFirebaseSession);
router.post('/logout', requireAuth, logoutSession);
router.get('/profile', requireAuth, getUserProfile);
router.post('/profile', requireAuth, updateUserProfile);
router.post('/send-email', requireAdmin, sendEmailNotification);
router.post('/fcm-token', requireAuth, saveFCMToken);

export default router;
