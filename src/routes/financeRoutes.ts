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
  verifyRazorpayPayment 
} from '../controllers/financeController';

import { handleRazorpayWebhook } from '../controllers/webhookController';

const router = express.Router();

// Real-Time Wallet & Payment Routes
router.get('/wallet', getWalletBalance);
router.post('/wallet/deduct', deductMoney);
router.post('/wallet/add', addMoney);
router.post('/wallet/transfer', transferMoney);
router.post('/wallet/pay-merchant', payMerchantWithWallet);

// Passbook & Receive QR
router.get('/transactions', getUserTransactions);
router.get('/my-qr', getMyQrPayload);

// Razorpay Gateway Routes
router.post('/razorpay/order', createRazorpayOrder);
router.post('/razorpay/verify', verifyRazorpayPayment);
router.post('/razorpay/webhook', handleRazorpayWebhook);

export default router;
