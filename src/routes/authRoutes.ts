import express from 'express';
import { loginSimulatedOTP, verifySimulatedOTP } from '../controllers/authController';

const router = express.Router();

router.post('/send-otp', loginSimulatedOTP);
router.post('/verify-otp', verifySimulatedOTP);

export default router;
