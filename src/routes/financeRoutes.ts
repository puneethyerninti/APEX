import express from 'express';
import { getWalletBalance, deductMoney, addMoney, createRazorpayOrder, verifyRazorpayPayment } from '../controllers/financeController';

import { handleRazorpayWebhook } from '../controllers/webhookController';

const router = express.Router();

router.get('/wallet', getWalletBalance);
router.post('/wallet/deduct', deductMoney);
router.post('/wallet/add', addMoney);

// Razorpay Routes
router.post('/razorpay/order', createRazorpayOrder);
router.post('/razorpay/verify', verifyRazorpayPayment);
router.post('/razorpay/webhook', handleRazorpayWebhook);

export default router;
