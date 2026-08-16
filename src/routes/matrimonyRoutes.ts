import express from 'express';
import { getProfiles, createProfile, getMessages, markMessagesAsRead, getInbox, getMyProfile } from '../controllers/matrimonyController';

const router = express.Router();

router.get('/profiles', getProfiles);
router.get('/profiles/me', getMyProfile);
router.post('/profile', createProfile);
router.get('/messages/:roomId', getMessages);
router.put('/messages/:roomId/read', markMessagesAsRead);
router.get('/inbox/:userId', getInbox);

export default router;
