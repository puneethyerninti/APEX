"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const userController_1 = require("../controllers/userController");
const router = express_1.default.Router();
router.get('/profile', userController_1.getUserProfile);
router.post('/profile', userController_1.updateUserProfile);
router.post('/verify-pan', userController_1.verifyPan);
router.post('/send-email', userController_1.sendEmailNotification);
exports.default = router;
