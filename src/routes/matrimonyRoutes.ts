import express from 'express';
import { getProfiles, createProfile, getMessages, markMessagesAsRead, getInbox, upgradeProfile, getMyProfile } from '../controllers/matrimonyController';

const router = express.Router();

router.get('/profiles', getProfiles);
router.get('/profiles/me', getMyProfile);
router.post('/profile', createProfile);
router.get('/messages/:roomId', getMessages);
router.put('/messages/:roomId/read', markMessagesAsRead);
router.get('/inbox/:userId', getInbox);
router.post('/upgrade', upgradeProfile);

export default router;
