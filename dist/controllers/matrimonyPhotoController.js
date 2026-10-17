"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProfilePhoto = getProfilePhoto;
const MatrimonyPhoto_1 = __importDefault(require("../models/MatrimonyPhoto"));
const MatrimonyProfile_1 = __importDefault(require("../models/MatrimonyProfile"));
const UserBlock_1 = __importDefault(require("../models/UserBlock"));
const User_1 = __importDefault(require("../models/User"));
const matrimonyPhotos_1 = require("../services/matrimonyPhotos");
async function getProfilePhoto(req, res) {
    if (!/^[a-f0-9]{24}$/.test(String(req.params.id)))
        return res.status(404).json({ error: 'Photo unavailable.' });
    try {
        const photo = await MatrimonyPhoto_1.default.findById(req.params.id);
        const viewer = req.user;
        if (!photo)
            return res.status(404).json({ error: 'Photo unavailable.' });
        if (String(photo.owner) !== viewer.id && viewer.role !== 'admin') {
            const approved = await MatrimonyProfile_1.default.exists({ user: photo.owner, ownerVerified: true, status: 'approved', images: (0, matrimonyPhotos_1.photoPath)(String(photo._id)) });
            const enabled = await User_1.default.exists({ _id: photo.owner, isDisabled: { $ne: true } });
            const blocked = await UserBlock_1.default.exists({ $or: [{ user: viewer.id, blocked: photo.owner }, { user: photo.owner, blocked: viewer.id }] });
            if (!approved || !enabled || blocked)
                return res.status(404).json({ error: 'Photo unavailable.' });
        }
        const content = await MatrimonyPhoto_1.default.findById(photo._id).select('+data');
        if (!content?.data)
            return res.status(404).json({ error: 'Photo unavailable.' });
        res.setHeader('Cache-Control', 'private, no-store');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        return res.type('image/jpeg').send(Buffer.from(content.data));
    }
    catch {
        return res.status(503).json({ error: 'Photos are temporarily unavailable. Please retry.' });
    }
}
