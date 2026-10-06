import express from 'express';
import { getProfiles, createProfile, getMessages, markMessagesAsRead, getInbox, getMyProfile, sendMessage } from '../controllers/matrimonyController';
import { requireAuth } from '../middleware/authMiddleware';

import { uploadProfileImages } from '../services/s3Upload';

const router = express.Router();
router.use(requireAuth);
const upload = uploadProfileImages;

router.get('/profiles', getProfiles);
router.get('/profiles/me', getMyProfile);
router.post('/profile', (req, res, next) => upload.array('images', 5)(req, res, error => {
  if (error) return res.status(400).json({ error: 'Profile image upload failed. Use up to five JPEG, PNG or WebP images under 5 MB each.' });
  next();
}), createProfile);
router.get('/messages/:roomId', getMessages);
router.post('/messages/:roomId', sendMessage);
router.put('/messages/:roomId/read', markMessagesAsRead);
router.get('/inbox/:userId', getInbox);

export default router;
