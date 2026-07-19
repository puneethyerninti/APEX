"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const matrimonyController_1 = require("../controllers/matrimonyController");
const router = express_1.default.Router();
router.get('/profiles', matrimonyController_1.getProfiles);
router.post('/profile', matrimonyController_1.createProfile);
router.get('/messages/:roomId', matrimonyController_1.getMessages);
router.put('/messages/:roomId/read', matrimonyController_1.markMessagesAsRead);
router.get('/inbox/:userId', matrimonyController_1.getInbox);
exports.default = router;
