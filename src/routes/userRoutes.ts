import express from 'express';
import { getUserProfile, updateUserProfile, sendEmailNotification, saveFCMToken, upgradeUserPlan } from '../controllers/userController';

const router = express.Router();

router.get('/profile', getUserProfile);
router.post('/profile', updateUserProfile);
router.post('/upgrade-plan', upgradeUserPlan);
router.post('/send-email', sendEmailNotification);
router.post('/fcm-token', saveFCMToken);

export default router;
