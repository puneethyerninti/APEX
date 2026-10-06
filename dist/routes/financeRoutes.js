"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const financeController_1 = require("../controllers/financeController");
const webhookController_1 = require("../controllers/webhookController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
// Real-Time Wallet & Payment Routes
router.get('/wallet', authMiddleware_1.requireAuth, financeController_1.getWalletBalance);
router.post('/wallet/deduct', authMiddleware_1.requireAuth, (_req, res) => res.status(400).json({ error: 'Use a supported checkout or APEX transfer. A wallet deduction alone does not deliver a service.' }));
router.post('/wallet/add', authMiddleware_1.requireAuth, (_req, res) => res.status(400).json({ error: 'Use Razorpay checkout to add money. A captured payment is required.' }));
router.post('/wallet/transfer', authMiddleware_1.requireAuth, financeController_1.transferMoney);
router.post('/wallet/pay-merchant', authMiddleware_1.requireAuth, financeController_1.payMerchantWithWallet);
router.post('/wallet/withdraw', authMiddleware_1.requireAuth, financeController_1.withdrawToBank);
// Passbook & Receive QR
router.get('/transactions', authMiddleware_1.requireAuth, financeController_1.getUserTransactions);
router.get('/my-qr', authMiddleware_1.requireAuth, financeController_1.getMyQrPayload);
// Razorpay Gateway Routes
router.post('/razorpay/order', authMiddleware_1.requireAuth, financeController_1.createRazorpayOrder);
router.post('/razorpay/verify', authMiddleware_1.requireAuth, financeController_1.verifyRazorpayPayment);
router.post('/razorpay/webhook', webhookController_1.handleRazorpayWebhook);
exports.default = router;
