import express from 'express';
import { getUserProfile, updateUserProfile, verifyPan, sendEmailNotification } from '../controllers/userController';

const router = express.Router();

router.get('/profile', getUserProfile);
router.post('/profile', updateUserProfile);
router.post('/verify-pan', verifyPan);
router.post('/send-email', sendEmailNotification);

export default router;
