import express from 'express';
import { exchangeFirebaseSession, getUserProfile, updateUserProfile, sendEmailNotification, saveFCMToken } from '../controllers/userController';
import { requireAuth, requireAdmin } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/session', exchangeFirebaseSession);
router.get('/profile', requireAuth, getUserProfile);
router.post('/profile', requireAuth, updateUserProfile);
router.post('/send-email', requireAdmin, sendEmailNotification);
router.post('/fcm-token', requireAuth, saveFCMToken);

export default router;
