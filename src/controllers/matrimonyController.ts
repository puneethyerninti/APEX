import { Request, Response } from 'express';
import mongoose from 'mongoose';
import MatrimonyProfile from '../models/MatrimonyProfile';
import Message from '../models/Message';
import Transaction from '../models/Transaction';
import { authorizeChat, activeMembership, normalizePlan, matrimonyPlans } from '../services/matrimonyPolicy';
import { persistChatMessage, publishChatMessage } from '../services/matrimonyMessages';
const owner = (req: Request) => String((req as any).user.id);
const fail = (res: Response, e: any) => res.status(e.code === 11000 ? 409 : e.httpStatus || 503).json({ error: e.code === 11000 ? 'Profile changed. Refresh and try again.' : e.message || 'Service unavailable' });
const membershipView = (profile: any) => profile ? { ...profile.toObject(), subscription: { ...profile.subscription, isActive: activeMembership(profile) } } : null;
const chatFail = (res: Response, e: any) => res.status(e.httpStatus || 503).json({ error: e.httpStatus ? e.message : 'Messages are temporarily unavailable. Please retry.' });

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
    const query: any = { roomId: req.params.roomId };
    if (req.query.before) {
      if (typeof req.query.before !== 'string' || !/^[a-f0-9]{24}$/.test(req.query.before)) return res.status(400).json({ error: 'Invalid message cursor.' });
      const anchor = await Message.findOne({ _id: req.query.before, roomId: req.params.roomId });
      if (!anchor) return res.status(400).json({ error: 'Message cursor not found.' });
      query.$or = [{ timestamp: { $lt: anchor.timestamp } }, { timestamp: anchor.timestamp, _id: { $lt: anchor._id } }];
    }
    const messages = await Message.find(query).sort({ timestamp: -1, _id: -1 }).limit(200);
    res.json(messages.reverse());
  } catch (e) { chatFail(res, e); }
};
export const sendMessage = async (req: Request, res: Response) => {
  try {
    const message = await persistChatMessage(owner(req), req.params.roomId, req.body.text, req.body.clientMessageId);
    publishChatMessage(req.app.get('io'), message);
    res.json(message);
  } catch (e) { chatFail(res, e); }
};
export const markMessagesAsRead = async (req: Request, res: Response) => {
  try {
    const other = await authorizeChat(owner(req), req.params.roomId);
    const ids = req.body.messageIds;
    // Cached older clients sent no IDs. Preserve compatibility without marking
    // messages the user has not opened.
    if (ids === undefined) return res.json({ success: true, messageIdsRequired: true });
    if (!Array.isArray(ids) || ids.length > 200 || ids.some(id => typeof id !== 'string' || !/^[a-f0-9]{24}$/.test(id))) return res.status(400).json({ error: 'Displayed message IDs are required.' });
    const result = await Message.updateMany({ _id: { $in: ids }, roomId: req.params.roomId, receiverId: owner(req), isRead: { $ne: true } }, { $set: { isRead: true } });
    if (result.modifiedCount) {
      const event = { roomId: req.params.roomId, readerId: owner(req), messageIds: ids };
      req.app.get('io')?.to('user_' + other).emit('messages_read', event);
      req.app.get('io')?.to('user_' + owner(req)).emit('messages_read', event);
    }
    res.json({ success: true });
  } catch (e) { chatFail(res, e); }
};
export const getInbox = async (req: Request, res: Response) => {
  try {
    if (req.params.userId !== owner(req)) return res.status(403).json({ error: 'Inbox access denied.' });
    const profile = await MatrimonyProfile.findOne({ user: owner(req), ownerVerified: true });
    if (!activeMembership(profile)) return res.status(403).json({ error: 'Active membership required.' });
    const chats = await Message.aggregate([
      { $match: { $or: [{ senderId: owner(req) }, { receiverId: owner(req) }] } },
      { $sort: { timestamp: -1, _id: -1 } },
      { $group: { _id: '$roomId', latestMessage: { $first: '$$ROOT' }, unreadCount: { $sum: { $cond: [{ $and: [{ $eq: ['$receiverId', owner(req)] }, { $eq: [{ $ifNull: ['$isRead', false] }, false] }] }, 1, 0] } } } },
      { $sort: { 'latestMessage.timestamp': -1, 'latestMessage._id': -1 } },
      { $limit: 100 }
    ]);
    const otherIds = chats.map(c => c.latestMessage.senderId === owner(req) ? c.latestMessage.receiverId : c.latestMessage.senderId).filter(id => mongoose.isValidObjectId(id));
    const profiles = await MatrimonyProfile.find({ user: { $in: otherIds }, ownerVerified: true, status: 'approved' }).populate('user', 'name');
    const byOwner = new Map(profiles.map(p => [String((p.user as any)?._id || p.user), p]));
    res.json(chats.flatMap(c => {
      const other = c.latestMessage.senderId === owner(req) ? c.latestMessage.receiverId : c.latestMessage.senderId;
      const p = byOwner.get(other);
      return p ? [{ latestMessage: c.latestMessage, unreadCount: c.unreadCount, profile: { ...p.toObject(), subscription: { plan: p.subscription.plan, isActive: activeMembership(p) } } }] : [];
    }));
  } catch (e) { chatFail(res, e); }
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
