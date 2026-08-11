import express from 'express';
import { getUserProfile, updateUserProfile, verifyPan, sendEmailNotification, saveFCMToken } from '../controllers/userController';

const router = express.Router();

router.get('/profile', getUserProfile);
router.post('/profile', updateUserProfile);
router.post('/verify-pan', verifyPan);
router.post('/send-email', sendEmailNotification);
router.post('/fcm-token', saveFCMToken);

export default router;
