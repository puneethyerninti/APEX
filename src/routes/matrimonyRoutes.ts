import express from 'express';
import { getProfiles, createProfile, getMessages, markMessagesAsRead, getInbox } from '../controllers/matrimonyController';

const router = express.Router();

router.get('/profiles', getProfiles);
router.post('/profile', createProfile);
router.get('/messages/:roomId', getMessages);
router.put('/messages/:roomId/read', markMessagesAsRead);
router.get('/inbox/:userId', getInbox);

export default router;
