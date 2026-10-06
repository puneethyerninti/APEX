"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const userController_1 = require("../controllers/userController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
router.post('/session', userController_1.exchangeFirebaseSession);
router.get('/profile', authMiddleware_1.requireAuth, userController_1.getUserProfile);
router.post('/profile', authMiddleware_1.requireAuth, userController_1.updateUserProfile);
router.post('/send-email', authMiddleware_1.requireAdmin, userController_1.sendEmailNotification);
router.post('/fcm-token', authMiddleware_1.requireAuth, userController_1.saveFCMToken);
exports.default = router;
