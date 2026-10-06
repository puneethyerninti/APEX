import { Request, Response } from 'express';
import mongoose from 'mongoose';
import MatrimonyProfile from '../models/MatrimonyProfile';
import Message from '../models/Message';
import Transaction from '../models/Transaction';
import { authorizeChat, activeMembership, normalizePlan, matrimonyPlans } from '../services/matrimonyPolicy';
const owner = (req: Request) => String((req as any).user.id);
const fail = (res: Response, e: any) => res.status(e.code === 11000 ? 409 : e.httpStatus || 503).json({ error: e.code === 11000 ? 'Profile changed. Refresh and try again.' : e.message || 'Service unavailable' });
const membershipView = (profile: any) => profile ? { ...profile.toObject(), subscription: { ...profile.subscription, isActive: activeMembership(profile) } } : null;

export const getMyProfile = async (req: Request, res: Response) => {
  try { res.json(membershipView(await MatrimonyProfile.findOne({ user: owner(req), ownerVerified: true }))); }
  catch (e) { fail(res, e); }
};
export const getProfiles = async (req: Request, res: Response) => {
  try {
    const profiles = await MatrimonyProfile.find({ ownerVerified: true, status: 'approved', user: { $ne: owner(req) } }).populate('user', 'name').limit(100);
    res.json(profiles.map(p => ({ ...p.toObject(), subscription: { plan: p.subscription.plan, isActive: activeMembership(p) } })));
  } catch (e) { fail(res, e); }
};
export const createProfile = async (req: Request, res: Response) => {
  try {
    const age = Number(req.body.age);
    const fields: any = {};
    if (!Number.isInteger(age) || age < 18 || age > 100) return res.status(400).json({ error: 'Enter a valid adult age.' });
    for (const field of ['height', 'religion', 'profession', 'location', 'bio', 'community']) {
      const value = req.body[field] || '';
      if (typeof value !== 'string' || value.length > (field === 'bio' ? 2000 : 120)) return res.status(400).json({ error: 'Invalid profile field: ' + field });
      fields[field] = value.trim();
    }
    if (!fields.profession || !fields.location || !fields.religion) return res.status(400).json({ error: 'Profession, city and religion are required.' });
    const files = (req.files || []) as any[];
    if (files.some(file => !/^image\/(jpeg|png|webp)$/.test(file.mimetype))) return res.status(400).json({ error: 'Only JPEG, PNG or WebP profile images are accepted.' });
    const images = files.map(file => file.location).filter(value => typeof value === 'string' && value.startsWith('https://'));
    const update: any = { ...fields, age, status: 'pending', ownerVerified: true };
    if (images.length) update.images = images;
    const profile = await MatrimonyProfile.findOneAndUpdate({ user: owner(req), ownerVerified: true }, { $set: update, $setOnInsert: { user: owner(req) } }, { upsert: true, new: true, runValidators: true });
    req.app.get('io')?.to('admin_room').emit('admin_data_refresh');
    res.json(membershipView(profile));
  } catch (e) { fail(res, e); }
};
export const getMessages = async (req: Request, res: Response) => {
  try {
    await authorizeChat(owner(req), req.params.roomId);
    const messages = await Message.find({ roomId: req.params.roomId }).sort({ timestamp: -1, _id: -1 }).limit(200);
    res.json(messages.reverse());
  } catch (e) { res.status(403).json({ error: (e as Error).message }); }
};
export const sendMessage = async (req: Request, res: Response) => {
  try {
    const receiverId = await authorizeChat(owner(req), req.params.roomId);
    const text = typeof req.body.text === 'string' ? req.body.text.trim() : '';
    if (!text || text.length > 2000) return res.status(400).json({ error: 'Message must contain 1-2000 characters.' });
    const clientMessageId = req.body.clientMessageId;
    if (typeof clientMessageId !== 'string' || !/^[a-zA-Z0-9-]{16,80}$/.test(clientMessageId)) return res.status(400).json({ error: 'Message reference required.' });
    const message = await Message.findOneAndUpdate({ senderId: owner(req), clientMessageId }, { $setOnInsert: { senderId: owner(req), receiverId, roomId: req.params.roomId, text, timestamp: new Date() } }, { upsert: true, new: true });
    if (message.roomId !== req.params.roomId || message.text !== text) return res.status(409).json({ error: 'Message reference was reused for different content.' });
    const io = req.app.get('io');
    io?.to('user_' + owner(req)).emit('receive_message', message.toObject());
    io?.to('user_' + receiverId).emit('receive_message', message.toObject());
    res.json(message);
  } catch (e) { res.status(403).json({ error: (e as Error).message }); }
};
export const markMessagesAsRead = async (req: Request, res: Response) => {
  try {
    await authorizeChat(owner(req), req.params.roomId);
    await Message.updateMany({ roomId: req.params.roomId, receiverId: owner(req), isRead: false }, { $set: { isRead: true } });
    res.json({ success: true });
  } catch (e) { res.status(403).json({ error: (e as Error).message }); }
};
export const getInbox = async (req: Request, res: Response) => {
  try {
    if (req.params.userId !== owner(req)) return res.status(403).json({ error: 'Inbox access denied.' });
    const profile = await MatrimonyProfile.findOne({ user: owner(req), ownerVerified: true });
    if (!activeMembership(profile)) return res.status(403).json({ error: 'Active membership required.' });
    const messages = await Message.find({ $or: [{ senderId: owner(req) }, { receiverId: owner(req) }] }).sort({ timestamp: -1 }).limit(500);
    const chats = new Map();
    for (const msg of messages) {
      if (chats.has(msg.roomId)) continue;
      const other = msg.senderId === owner(req) ? msg.receiverId : msg.senderId;
      if (!mongoose.isValidObjectId(other)) continue;
      const otherProfile = await MatrimonyProfile.findOne({ user: other, ownerVerified: true, status: 'approved' }).populate('user', 'name');
      if (otherProfile) chats.set(msg.roomId, { latestMessage: msg, profile: otherProfile });
    }
    res.json([...chats.values()]);
  } catch (e) { fail(res, e); }
};
export const handleMatrimonyUpgrade = async (userId: string, value: string, _metadata?: any, transaction?: any) => {
  const plan = normalizePlan(value);
  if (!matrimonyPlans[plan] || !transaction || transaction.category !== 'matrimony' || transaction.status !== 'completed' || transaction.amount !== matrimonyPlans[plan].amount) throw new Error('A matching captured membership payment is required.');
  const session = await mongoose.startSession();
  let result: any;
  try {
    await session.withTransaction(async () => {
      const tx = await Transaction.findById(transaction._id).session(session);
      if (!tx || tx.status !== 'completed' || tx.user.toString() !== userId || tx.category !== 'matrimony' || tx.amount !== matrimonyPlans[plan].amount || normalizePlan(tx.metadata?.plan) !== plan) throw new Error('Invalid membership payment owner or plan.');
      if (tx.metadata?.fulfilled) { result = tx.metadata.fulfillmentResult; return; }
      const profile = await MatrimonyProfile.findOne({ user: userId, ownerVerified: true, status: 'approved' }).session(session);
      if (!profile) throw new Error('Approved APEX matrimony profile required. Payment needs support reconciliation.');
      const expiry = new Date(Math.max(Date.now(), profile.subscription.expiresAt?.getTime() || 0));
      expiry.setUTCMonth(expiry.getUTCMonth() + matrimonyPlans[plan].months);
      profile.subscription = { plan: plan as any, isActive: true, expiresAt: expiry, paymentTransactionId: tx._id as mongoose.Types.ObjectId };
      await profile.save({ session });
      result = { profileId: profile._id.toString(), plan, expiresAt: expiry };
      await Transaction.updateOne({ _id: tx._id }, { $set: { 'metadata.fulfilled': true, 'metadata.fulfillmentResult': result, 'metadata.fulfilledAt': new Date() } }, { session });
    });
  } finally { await session.endSession(); }
  return result;
};
