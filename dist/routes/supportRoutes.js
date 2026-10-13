"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const mongoose_1 = __importDefault(require("mongoose"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const SupportRequest_1 = __importDefault(require("../models/SupportRequest"));
const UserBlock_1 = __importDefault(require("../models/UserBlock"));
const User_1 = __importDefault(require("../models/User"));
const MatrimonyProfile_1 = __importDefault(require("../models/MatrimonyProfile"));
const AuthSession_1 = __importDefault(require("../models/AuthSession"));
const router = express_1.default.Router();
router.use(authMiddleware_1.requireAuth);
router.get('/requests', async (req, res) => {
    try {
        res.json(await SupportRequest_1.default.find({ user: req.user.id }).sort({ createdAt: -1 }).limit(50));
    }
    catch {
        res.status(503).json({ error: 'Support requests are temporarily unavailable.' });
    }
});
router.post('/requests', (0, express_rate_limit_1.default)({ windowMs: 60000, limit: 5 }), async (req, res) => {
    try {
        const user = String(req.user.id);
        const { kind, reason, targetUser } = req.body;
        if (!['account_deletion', 'content_report', 'support'].includes(kind) || typeof reason !== 'string' || !reason.trim() || reason.length > 2000)
            return res.status(400).json({ error: 'A valid request and reason are required.' });
        if (kind === 'content_report' && (!mongoose_1.default.isValidObjectId(targetUser) || String(targetUser) === user || !await User_1.default.exists({ _id: targetUser })))
            return res.status(400).json({ error: 'Select a valid member to report.' });
        const existing = kind === 'account_deletion' ? await SupportRequest_1.default.findOne({ user, kind, status: { $in: ['open', 'in_review'] } }) : null;
        const request = existing || await SupportRequest_1.default.create({ user, kind, reason: reason.trim(), ...(kind === 'content_report' ? { targetUser } : {}) });
        req.app.get('io')?.to('admin_room').emit('admin_data_refresh');
        return res.status(existing ? 200 : 201).json(request);
    }
    catch {
        return res.status(503).json({ error: 'Request was not confirmed. Please retry or contact support.' });
    }
});
router.post('/blocks/:id', async (req, res) => {
    try {
        const user = String(req.user.id), blocked = String(req.params.id);
        if (!mongoose_1.default.isValidObjectId(blocked) || blocked === user || !await User_1.default.exists({ _id: blocked }))
            return res.status(400).json({ error: 'Invalid member.' });
        await UserBlock_1.default.updateOne({ user, blocked }, { $setOnInsert: { user, blocked } }, { upsert: true });
        return res.json({ success: true });
    }
    catch {
        return res.status(503).json({ error: 'Blocking was not confirmed. Please retry.' });
    }
});
router.get('/admin', authMiddleware_1.requireAdmin, async (_req, res) => {
    try {
        res.json(await SupportRequest_1.default.find({}).sort({ createdAt: -1 }).populate('user', 'name phone').limit(200));
    }
    catch {
        res.status(503).json({ error: 'Review queue is unavailable.' });
    }
});
router.patch('/admin/:id', authMiddleware_1.requireAdmin, async (req, res) => {
    try {
        const { status, resolution } = req.body;
        if (!mongoose_1.default.isValidObjectId(req.params.id) || !['in_review', 'resolved'].includes(status) || typeof resolution !== 'string' || !resolution.trim() || resolution.length > 2000)
            return res.status(400).json({ error: 'A valid status and review note are required.' });
        const request = await SupportRequest_1.default.findByIdAndUpdate(req.params.id, { $set: { status, resolution: resolution.trim(), reviewedBy: req.user.id } }, { new: true, runValidators: true });
        return request ? res.json(request) : res.status(404).json({ error: 'Request not found.' });
    }
    catch {
        return res.status(503).json({ error: 'Review was not saved.' });
    }
});
router.post('/admin/:id/moderate', authMiddleware_1.requireAdmin, async (req, res) => {
    try {
        if (!mongoose_1.default.isValidObjectId(req.params.id) || !['hide_profile', 'disable_member'].includes(req.body.action))
            return res.status(400).json({ error: 'Select a valid moderation action.' });
        const request = await SupportRequest_1.default.findOne({ _id: req.params.id, kind: 'content_report' });
        if (!request?.targetUser)
            return res.status(404).json({ error: 'Reported member not found.' });
        const target = await User_1.default.findById(request.targetUser);
        if (!target || target.role === 'admin')
            return res.status(409).json({ error: 'This report requires owner review.' });
        if (req.body.action === 'disable_member') {
            await User_1.default.updateOne({ _id: target._id }, { $set: { isDisabled: true } });
            await AuthSession_1.default.deleteMany({ userId: target._id });
            req.app.get('io')?.in('user_' + target._id).disconnectSockets(true);
        }
        await MatrimonyProfile_1.default.updateMany({ user: target._id }, { $set: { status: 'rejected' } });
        await SupportRequest_1.default.updateOne({ _id: request._id }, { $set: { status: 'in_review', reviewedBy: req.user.id, resolution: 'Moderation action: ' + req.body.action } });
        return res.json({ success: true });
    }
    catch {
        return res.status(503).json({ error: 'Moderation could not be fully confirmed. Check the member state before retrying.' });
    }
});
exports.default = router;
