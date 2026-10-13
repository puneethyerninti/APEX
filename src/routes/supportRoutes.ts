import express from 'express';
import mongoose from 'mongoose';
import rateLimit from 'express-rate-limit';
import { requireAuth, requireAdmin } from '../middleware/authMiddleware';
import SupportRequest from '../models/SupportRequest';
import UserBlock from '../models/UserBlock';
import User from '../models/User';
import MatrimonyProfile from '../models/MatrimonyProfile';
import AuthSession from '../models/AuthSession';
const router = express.Router();
router.use(requireAuth);
router.get('/requests', async (req, res) => {
  try { res.json(await SupportRequest.find({ user: (req as any).user.id }).sort({ createdAt: -1 }).limit(50)); }
  catch { res.status(503).json({ error: 'Support requests are temporarily unavailable.' }); }
});
router.post('/requests', rateLimit({ windowMs: 60000, limit: 5 }), async (req, res) => {
  try {
    const user = String((req as any).user.id);
    const { kind, reason, targetUser } = req.body;
    if (!['account_deletion', 'content_report', 'support'].includes(kind) || typeof reason !== 'string' || !reason.trim() || reason.length > 2000) return res.status(400).json({ error: 'A valid request and reason are required.' });
    if (kind === 'content_report' && (!mongoose.isValidObjectId(targetUser) || String(targetUser) === user || !await User.exists({ _id: targetUser }))) return res.status(400).json({ error: 'Select a valid member to report.' });
    const existing = kind === 'account_deletion' ? await SupportRequest.findOne({ user, kind, status: { $in: ['open', 'in_review'] } }) : null;
    const request = existing || await SupportRequest.create({ user, kind, reason: reason.trim(), ...(kind === 'content_report' ? { targetUser } : {}) });
    req.app.get('io')?.to('admin_room').emit('admin_data_refresh');
    return res.status(existing ? 200 : 201).json(request);
  } catch { return res.status(503).json({ error: 'Request was not confirmed. Please retry or contact support.' }); }
});
router.post('/blocks/:id', async (req, res) => {
  try {
    const user = String((req as any).user.id), blocked = String(req.params.id);
    if (!mongoose.isValidObjectId(blocked) || blocked === user || !await User.exists({ _id: blocked })) return res.status(400).json({ error: 'Invalid member.' });
    await UserBlock.updateOne({ user, blocked }, { $setOnInsert: { user, blocked } }, { upsert: true });
    return res.json({ success: true });
  } catch { return res.status(503).json({ error: 'Blocking was not confirmed. Please retry.' }); }
});
router.get('/admin', requireAdmin, async (_req, res) => {
  try { res.json(await SupportRequest.find({}).sort({ createdAt: -1 }).populate('user', 'name phone').limit(200)); }
  catch { res.status(503).json({ error: 'Review queue is unavailable.' }); }
});
router.patch('/admin/:id', requireAdmin, async (req, res) => {
  try {
    const { status, resolution } = req.body;
    if (!mongoose.isValidObjectId(req.params.id) || !['in_review', 'resolved'].includes(status) || typeof resolution !== 'string' || !resolution.trim() || resolution.length > 2000) return res.status(400).json({ error: 'A valid status and review note are required.' });
    const request = await SupportRequest.findByIdAndUpdate(req.params.id, { $set: { status, resolution: resolution.trim(), reviewedBy: (req as any).user.id } }, { new: true, runValidators: true });
    return request ? res.json(request) : res.status(404).json({ error: 'Request not found.' });
  } catch { return res.status(503).json({ error: 'Review was not saved.' }); }
});
router.post('/admin/:id/moderate', requireAdmin, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id) || !['hide_profile', 'disable_member'].includes(req.body.action)) return res.status(400).json({ error: 'Select a valid moderation action.' });
    const request = await SupportRequest.findOne({ _id: req.params.id, kind: 'content_report' });
    if (!request?.targetUser) return res.status(404).json({ error: 'Reported member not found.' });
    const target = await User.findById(request.targetUser);
    if (!target || target.role === 'admin') return res.status(409).json({ error: 'This report requires owner review.' });
    if (req.body.action === 'disable_member') {
      await User.updateOne({ _id: target._id }, { $set: { isDisabled: true } });
      await AuthSession.deleteMany({ userId: target._id });
      req.app.get('io')?.in('user_' + target._id).disconnectSockets(true);
    }
    await MatrimonyProfile.updateMany({ user: target._id }, { $set: { status: 'rejected' } });
    await SupportRequest.updateOne({ _id: request._id }, { $set: { status: 'in_review', reviewedBy: (req as any).user.id, resolution: 'Moderation action: ' + req.body.action } });
    return res.json({ success: true });
  } catch { return res.status(503).json({ error: 'Moderation could not be fully confirmed. Check the member state before retrying.' }); }
});
export default router;
