import express from 'express';
import { getProfiles, createProfile, getMessages, markMessagesAsRead, getInbox, getMyProfile } from '../controllers/matrimonyController';

import { uploadToS3 } from '../services/s3Upload';

const router = express.Router();
const upload = uploadToS3;

router.get('/profiles', getProfiles);
router.get('/profiles/me', getMyProfile);
router.post('/profile', upload.array('images', 5), createProfile);
router.get('/messages/:roomId', getMessages);
router.put('/messages/:roomId/read', markMessagesAsRead);
router.get('/inbox/:userId', getInbox);

export default router;
