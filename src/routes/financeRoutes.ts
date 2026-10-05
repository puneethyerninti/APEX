import express from 'express';
import { 
  getWalletBalance, 
  deductMoney, 
  addMoney, 
  transferMoney, 
  payMerchantWithWallet, 
  getUserTransactions, 
  getMyQrPayload, 
  createRazorpayOrder, 
  verifyRazorpayPayment,
  withdrawToBank
} from '../controllers/financeController';

import { handleRazorpayWebhook } from '../controllers/webhookController';
import { requireAuth } from '../middleware/authMiddleware';

const router = express.Router();

// Real-Time Wallet & Payment Routes
router.get('/wallet', requireAuth, getWalletBalance);
router.post('/wallet/deduct', requireAuth, deductMoney);
router.post('/wallet/add', requireAuth, (_req, res) => res.status(400).json({ error: 'Use Razorpay checkout to add money. A captured payment is required.' }));
router.post('/wallet/transfer', requireAuth, transferMoney);
router.post('/wallet/pay-merchant', requireAuth, payMerchantWithWallet);
router.post('/wallet/withdraw', requireAuth, withdrawToBank);

// Passbook & Receive QR
router.get('/transactions', requireAuth, getUserTransactions);
router.get('/my-qr', requireAuth, getMyQrPayload);

// Razorpay Gateway Routes
router.post('/razorpay/order', requireAuth, createRazorpayOrder);
router.post('/razorpay/verify', requireAuth, verifyRazorpayPayment);
router.post('/razorpay/webhook', handleRazorpayWebhook);

export default router;
