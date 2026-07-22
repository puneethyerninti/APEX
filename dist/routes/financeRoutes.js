"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const financeController_1 = require("../controllers/financeController");
const webhookController_1 = require("../controllers/webhookController");
const router = express_1.default.Router();
router.get('/wallet', financeController_1.getWalletBalance);
router.post('/wallet/deduct', financeController_1.deductMoney);
router.post('/wallet/add', financeController_1.addMoney);
// Razorpay Routes
router.post('/razorpay/order', financeController_1.createRazorpayOrder);
router.post('/razorpay/verify', financeController_1.verifyRazorpayPayment);
router.post('/razorpay/webhook', webhookController_1.handleRazorpayWebhook);
router.post('/razorpay/record-mock', financeController_1.recordMockTransaction);
exports.default = router;
