import express from 'express';
import { getWalletBalance, deductMoney, addMoney, createRazorpayOrder, verifyRazorpayPayment } from '../controllers/financeController';

import { handleRazorpayWebhook } from '../controllers/webhookController';

const router = express.Router();

import { z } from 'zod';
import { validate } from '../middleware/validate';

const moneySchema = z.object({
  body: z.object({
    amount: z.number().positive('Amount must be a positive number'),
    category: z.string().optional()
  })
});

router.get('/wallet', getWalletBalance);
router.post('/wallet/deduct', validate(moneySchema), deductMoney);
router.post('/wallet/add', validate(moneySchema), addMoney);

// Razorpay Routes
router.post('/razorpay/order', createRazorpayOrder);
router.post('/razorpay/verify', verifyRazorpayPayment);
router.post('/razorpay/webhook', handleRazorpayWebhook);

export default router;
