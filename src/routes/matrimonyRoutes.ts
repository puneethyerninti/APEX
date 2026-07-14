import express from 'express';
import { getProfiles, createProfile } from '../controllers/matrimonyController';

const router = express.Router();

router.get('/profiles', getProfiles);
router.post('/profiles', createProfile);

export default router;
