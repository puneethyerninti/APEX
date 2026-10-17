"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const matrimonyController_1 = require("../controllers/matrimonyController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const multer_1 = __importDefault(require("multer"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const matrimonyPhotoController_1 = require("../controllers/matrimonyPhotoController");
const router = express_1.default.Router();
router.use(authMiddleware_1.requireAuth);
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 5, fields: 12, fieldSize: 16000, parts: 17 } });
const profileLimiter = (0, express_rate_limit_1.default)({ windowMs: 15 * 60 * 1000, limit: 20, keyGenerator: req => String(req.user.id), message: { error: 'Too many profile submissions. Please wait before trying again.' } });
let processing = 0;
router.get('/profiles', matrimonyController_1.getProfiles);
router.get('/profiles/me', matrimonyController_1.getMyProfile);
router.get('/photos/:id', matrimonyPhotoController_1.getProfilePhoto);
router.post('/profile', profileLimiter, (req, res, next) => {
    if (processing >= 2)
        return res.status(503).set('Retry-After', '5').json({ error: 'Profile uploads are busy. Your changes are not saved yet; please retry shortly.' });
    processing++;
    let released = false;
    const release = () => { if (!released) {
        released = true;
        processing--;
    } };
    res.locals.releaseProfileUpload = release;
    res.once('finish', release);
    res.once('close', () => { if (!res.locals.profileWorkStarted)
        release(); });
    next();
}, (req, res, next) => upload.array('images', 5)(req, res, error => {
    if (error) {
        if (error.code === 'LIMIT_FILE_SIZE')
            return res.status(413).json({ error: 'Each uploaded photo must be under 5 MB. Choose a smaller photo and retry.' });
        if (['LIMIT_FILE_COUNT', 'LIMIT_UNEXPECTED_FILE'].includes(error.code))
            return res.status(400).json({ error: 'Choose up to five profile photos using the photo picker.' });
        return res.status(400).json({ error: 'The upload could not be read. Your changes were not saved; select the photos again and retry.' });
    }
    if (req.aborted || res.destroyed) {
        res.locals.releaseProfileUpload();
        return;
    }
    next();
}), async (req, res) => {
    res.locals.profileWorkStarted = true;
    try {
        await (0, matrimonyController_1.createProfile)(req, res);
    }
    finally {
        res.locals.releaseProfileUpload();
    }
});
router.get('/messages/:roomId', matrimonyController_1.getMessages);
router.post('/messages/:roomId', matrimonyController_1.sendMessage);
router.put('/messages/:roomId/read', matrimonyController_1.markMessagesAsRead);
router.get('/inbox/:userId', matrimonyController_1.getInbox);
exports.default = router;
