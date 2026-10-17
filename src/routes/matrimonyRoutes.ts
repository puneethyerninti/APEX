import express from 'express';
import { getProfiles, createProfile, getMessages, markMessagesAsRead, getInbox, getMyProfile, sendMessage } from '../controllers/matrimonyController';
import { requireAuth } from '../middleware/authMiddleware';

import multer from 'multer';
import rateLimit from 'express-rate-limit';
import { getProfilePhoto } from '../controllers/matrimonyPhotoController';

const router = express.Router();
router.use(requireAuth);
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 5, fields: 12, fieldSize: 16000, parts: 17 } });
const profileLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, keyGenerator: req => String((req as any).user.id), message: { error: 'Too many profile submissions. Please wait before trying again.' } });
let processing = 0;

router.get('/profiles', getProfiles);
router.get('/profiles/me', getMyProfile);
router.get('/photos/:id', getProfilePhoto);
router.post('/profile', profileLimiter, (req, res, next) => {
  if (processing >= 2) return res.status(503).set('Retry-After', '5').json({ error: 'Profile uploads are busy. Your changes are not saved yet; please retry shortly.' });
  processing++;
  let released = false;
  const release = () => { if (!released) { released = true; processing--; } };
  res.locals.releaseProfileUpload = release;
  res.once('finish', release); res.once('close', () => { if (!res.locals.profileWorkStarted) release(); });
  next();
}, (req, res, next) => upload.array('images', 5)(req, res, error => {
  if (error) {
    if (error.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'Each uploaded photo must be under 5 MB. Choose a smaller photo and retry.' });
    if (['LIMIT_FILE_COUNT', 'LIMIT_UNEXPECTED_FILE'].includes(error.code)) return res.status(400).json({ error: 'Choose up to five profile photos using the photo picker.' });
    return res.status(400).json({ error: 'The upload could not be read. Your changes were not saved; select the photos again and retry.' });
  }
  if (req.aborted || res.destroyed) { res.locals.releaseProfileUpload(); return; }
  next();
}), async (req, res) => {
  res.locals.profileWorkStarted = true;
  try { await createProfile(req, res); }
  finally { res.locals.releaseProfileUpload(); }
});
router.get('/messages/:roomId', getMessages);
router.post('/messages/:roomId', sendMessage);
router.put('/messages/:roomId/read', markMessagesAsRead);
router.get('/inbox/:userId', getInbox);

export default router;
