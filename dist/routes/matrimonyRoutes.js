"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const matrimonyController_1 = require("../controllers/matrimonyController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const s3Upload_1 = require("../services/s3Upload");
const router = express_1.default.Router();
router.use(authMiddleware_1.requireAuth);
const upload = s3Upload_1.uploadProfileImages;
router.get('/profiles', matrimonyController_1.getProfiles);
router.get('/profiles/me', matrimonyController_1.getMyProfile);
router.post('/profile', (req, res, next) => upload.array('images', 5)(req, res, error => {
    if (error)
        return res.status(400).json({ error: 'Profile image upload failed. Use up to five JPEG, PNG or WebP images under 5 MB each.' });
    next();
}), matrimonyController_1.createProfile);
router.get('/messages/:roomId', matrimonyController_1.getMessages);
router.post('/messages/:roomId', matrimonyController_1.sendMessage);
router.put('/messages/:roomId/read', matrimonyController_1.markMessagesAsRead);
router.get('/inbox/:userId', matrimonyController_1.getInbox);
exports.default = router;
