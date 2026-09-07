"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const financeController_1 = require("../controllers/financeController");
const webhookController_1 = require("../controllers/webhookController");
const router = express_1.default.Router();
const zod_1 = require("zod");
const validate_1 = require("../middleware/validate");
const moneySchema = zod_1.z.object({
    body: zod_1.z.object({
        amount: zod_1.z.number().positive('Amount must be a positive number'),
        category: zod_1.z.string().optional()
    })
});
router.get('/wallet', financeController_1.getWalletBalance);
router.post('/wallet/deduct', (0, validate_1.validate)(moneySchema), financeController_1.deductMoney);
router.post('/wallet/add', (0, validate_1.validate)(moneySchema), financeController_1.addMoney);
// Razorpay Routes
router.post('/razorpay/order', financeController_1.createRazorpayOrder);
router.post('/razorpay/verify', financeController_1.verifyRazorpayPayment);
router.post('/razorpay/webhook', webhookController_1.handleRazorpayWebhook);
exports.default = router;
