"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const notificationController_1 = require("../controllers/notificationController");
const router = express_1.default.Router();
// Email routes
router.post('/email', authMiddleware_1.requireAdmin, notificationController_1.sendEmailNotification);
router.use(authMiddleware_1.requireAuth);
// App notification routes
router.get('/user/:userId', notificationController_1.getUserNotifications);
router.put('/:id/read', notificationController_1.markAsRead);
router.put('/mark-all-read', notificationController_1.markAllAsRead);
exports.default = router;
