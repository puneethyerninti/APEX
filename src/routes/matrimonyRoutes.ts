import express from 'express';
import { getProfiles, createProfile, getMessages, getInbox } from '../controllers/matrimonyController';

const router = express.Router();

router.get('/profiles', getProfiles);
router.post('/profiles', createProfile);
router.get('/messages/:roomId', getMessages);
router.get('/inbox/:userId', getInbox);

export default router;
