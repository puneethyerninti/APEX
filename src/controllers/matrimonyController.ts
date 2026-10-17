import { Request, Response } from 'express';
import mongoose from 'mongoose';
import MatrimonyProfile from '../models/MatrimonyProfile';
import Message from '../models/Message';
import Transaction from '../models/Transaction';
import { authorizeChat, activeMembership, normalizePlan, matrimonyPlans, blockedMembers } from '../services/matrimonyPolicy';
import { persistChatMessage, publishChatMessage } from '../services/matrimonyMessages';
import { extendMembership } from '../services/membershipExpiry';
import { saveProfileWithPhotos } from '../services/matrimonyPhotos';
import User from '../models/User';
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
    const blocked = await blockedMembers(owner(req));
    const profiles = await MatrimonyProfile.aggregate([
      { $match: { ownerVerified: true, status: 'approved', user: { $nin: [owner(req), ...blocked].map(id => new mongoose.Types.ObjectId(id)) } } },
      { $sort: { updatedAt: -1, _id: -1 } },
      { $lookup: { from: User.collection.name, localField: 'user', foreignField: '_id', as: 'member' } },
      { $unwind: '$member' },
      { $match: { 'member.isDisabled': { $ne: true } } },
      { $limit: 100 },
      { $set: { user: { _id: '$member._id', name: '$member.name' } } },
      { $unset: 'member' }
    ]);
    res.json(profiles.map(p => ({ ...p, subscription: { plan: p.subscription?.plan || 'Free', isActive: !!activeMembership(p) } })));
  } catch (e) { fail(res, e); }
};
export const createProfile = async (req: Request, res: Response) => {
  try {
    const age = Number(req.body.age);
    if (![true, 'true'].includes(req.body.acceptedTerms)) return res.status(400).json({ error: 'Accept the terms and community safety rules before submitting your profile.' });
    const fields: any = {};
    if (!Number.isInteger(age) || age < 18 || age > 100) return res.status(400).json({ error: 'Enter a valid adult age.' });
    for (const field of ['height', 'religion', 'profession', 'location', 'bio', 'community']) {
      const value = req.body[field] || '';
      if (typeof value !== 'string' || value.length > (field === 'bio' ? 2000 : 120)) return res.status(400).json({ error: 'Invalid profile field: ' + field });
      fields[field] = value.trim();
    }
    if (!fields.profession || !fields.location || !fields.religion) return res.status(400).json({ error: 'Profession, city and religion are required.' });
    const profile = await saveProfileWithPhotos(owner(req), { ...fields, age }, (req.files || []) as Express.Multer.File[], req.body.retainedImages, req.body.expectedReviewVersion);
    req.app.get('io')?.to('admin_room').emit('admin_data_refresh');
    req.app.get('io')?.to('user_' + owner(req)).emit('matrimony_profile_changed');
    req.app.get('io')?.emit('matrimony_profiles_changed');
    res.json(membershipView(profile));
  } catch (e: any) {
    if (e.httpStatus || e.code === 11000) return fail(res, e);
    console.error('Matrimony profile save failed:', e.code || e.name || 'storage_error');
    res.status(503).json({ error: 'Your profile could not be saved. Your changes are still in the form; please retry.' });
  }
};
export const getMessages = async (req: Request, res: Response) => {
  try {
    await authorizeChat(owner(req), req.params.roomId);
    const query: any = { roomId: req.params.roomId };
    if (req.query.before && req.query.after) return res.status(400).json({ error: 'Use one message cursor at a time.' });
    const cursor = req.query.after || req.query.before;
    if (cursor) {
      if (typeof cursor !== 'string' || !/^[a-f0-9]{24}$/.test(cursor)) return res.status(400).json({ error: 'Invalid message cursor.' });
      const anchor = await Message.findOne({ _id: cursor, roomId: req.params.roomId });
      if (!anchor) return res.status(400).json({ error: 'Message cursor not found.' });
      const direction = req.query.after ? '$gt' : '$lt';
      query.$or = [{ timestamp: { [direction]: anchor.timestamp } }, { timestamp: anchor.timestamp, _id: { [direction]: anchor._id } }];
    }
    const order = req.query.after ? 1 : -1;
    const messages = await Message.find(query).sort({ timestamp: order, _id: order }).limit(200);
    res.json(req.query.after ? messages : messages.reverse());
  } catch (e) { chatFail(res, e); }
};
export const sendMessage = async (req: Request, res: Response) => {
  try {
    const message = await persistChatMessage(owner(req), req.params.roomId, req.body.text, req.body.clientMessageId);
    await publishChatMessage(req.app.get('io'), message);
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
    const blocked = await blockedMembers(owner(req));
    const chats = await Message.aggregate([
      { $match: { $or: [{ senderId: owner(req) }, { receiverId: owner(req) }] } },
      { $sort: { timestamp: -1, _id: -1 } },
      { $group: { _id: '$roomId', latestMessage: { $first: '$$ROOT' }, unreadCount: { $sum: { $cond: [{ $and: [{ $eq: ['$receiverId', owner(req)] }, { $eq: [{ $ifNull: ['$isRead', false] }, false] }] }, 1, 0] } } } },
      { $set: { otherId: { $cond: [{ $eq: ['$latestMessage.senderId', owner(req)] }, '$latestMessage.receiverId', '$latestMessage.senderId'] } } },
      { $match: { otherId: { $nin: blocked } } },
      { $set: { otherObjectId: { $convert: { input: '$otherId', to: 'objectId', onError: null, onNull: null } } } },
      { $lookup: { from: MatrimonyProfile.collection.name, localField: 'otherObjectId', foreignField: 'user', pipeline: [{ $match: { ownerVerified: true, status: 'approved' } }], as: 'profile' } },
      { $unwind: '$profile' },
      { $lookup: { from: User.collection.name, localField: 'otherObjectId', foreignField: '_id', pipeline: [{ $match: { isDisabled: { $ne: true } } }, { $project: { name: 1 } }], as: 'member' } },
      { $unwind: '$member' },
      { $sort: { 'latestMessage.timestamp': -1, 'latestMessage._id': -1 } },
      { $limit: 100 }
    ]);
    res.json(chats.map(c => ({ latestMessage: c.latestMessage, unreadCount: c.unreadCount, profile: { ...c.profile, user: c.member, subscription: { plan: c.profile.subscription?.plan || 'Free', isActive: !!activeMembership(c.profile) } } })));
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
      const expiry = extendMembership(new Date(Math.max(Date.now(), profile.subscription.expiresAt?.getTime() || 0)), matrimonyPlans[plan].months);
      profile.subscription = { plan: plan as any, isActive: true, expiresAt: expiry, paymentTransactionId: tx._id as mongoose.Types.ObjectId };
      await profile.save({ session });
      result = { profileId: profile._id.toString(), plan, expiresAt: expiry };
      await Transaction.updateOne({ _id: tx._id }, { $set: { 'metadata.fulfilled': true, 'metadata.fulfillmentResult': result, 'metadata.fulfilledAt': new Date() } }, { session });
    });
  } finally { await session.endSession(); }
  return result;
};
