"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const financeController_1 = require("../controllers/financeController");
const router = express_1.default.Router();
router.get('/wallet', financeController_1.getWalletBalance);
router.post('/wallet/deduct', financeController_1.deductMoney);
router.post('/wallet/add', financeController_1.addMoney);
// Razorpay Routes
router.post('/razorpay/order', financeController_1.createRazorpayOrder);
router.post('/razorpay/verify', financeController_1.verifyRazorpayPayment);
exports.default = router;
