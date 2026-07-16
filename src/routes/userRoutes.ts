import express from 'express';
import { getUserProfile, updateUserProfile } from '../controllers/userController';

const router = express.Router();

router.get('/profile', getUserProfile);
router.post('/profile', updateUserProfile);

export default router;
