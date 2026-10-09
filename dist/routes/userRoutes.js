"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const userController_1 = require("../controllers/userController");
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
router.post('/admin-otp/eligibility', (0, express_rate_limit_1.default)({ windowMs: 60000, max: 5, standardHeaders: true, legacyHeaders: false,
    message: { error: 'Too many admin sign-in attempts. Please wait a minute.' } }), userController_1.checkAdminOtpEligibility);
router.post('/session', (0, express_rate_limit_1.default)({ windowMs: 60000, max: 30, standardHeaders: true, legacyHeaders: false,
    message: { error: 'Too many sign-in attempts. Please wait a minute.' } }), userController_1.exchangeFirebaseSession);
router.post('/logout', authMiddleware_1.requireAuth, userController_1.logoutSession);
router.get('/profile', authMiddleware_1.requireAuth, userController_1.getUserProfile);
router.post('/profile', authMiddleware_1.requireAuth, userController_1.updateUserProfile);
router.post('/send-email', authMiddleware_1.requireAdmin, userController_1.sendEmailNotification);
router.post('/fcm-token', authMiddleware_1.requireAuth, userController_1.saveFCMToken);
exports.default = router;
