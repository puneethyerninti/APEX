import express from 'express';
import { getProfiles, createProfile, getMessages } from '../controllers/matrimonyController';

const router = express.Router();

router.get('/profiles', getProfiles);
router.post('/profiles', createProfile);
router.get('/messages/:roomId', getMessages);

export default router;
