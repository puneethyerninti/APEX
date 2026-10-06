import mongoose from 'mongoose';
import MatrimonyProfile from '../models/MatrimonyProfile';
export const matrimonyPlans: Record<string, { amount: number; months: number }> = {
  Silver: { amount: 5000, months: 3 }, Gold: { amount: 10000, months: 6 }, Diamond: { amount: 20000, months: 12 }
};
export const normalizePlan = (value: unknown) => {
  const plan = typeof value === 'string' ? value.replace(/^Matrimony /, '').replace(/ Plan$/, '') : '';
  const normalized = plan === 'Premium' ? 'Diamond' : plan;
  return ['Silver', 'Gold', 'Diamond'].includes(normalized) ? normalized : '';
};
export const activeMembership = (profile: any) => profile?.status === 'approved' && profile.subscription?.isActive === true &&
  profile.subscription.expiresAt && new Date(profile.subscription.expiresAt).getTime() > Date.now();
export function roomParticipants(room: unknown, userId: string) {
  if (typeof room !== 'string' || !/^match_[a-f0-9]{24}_[a-f0-9]{24}$/.test(room)) throw new Error('Invalid chat room.');
  const ids = room.slice(6).split('_');
  if (!ids.includes(userId) || ids[0] === ids[1] || ids.join('_') !== [...ids].sort().join('_')) throw new Error('Chat access denied.');
  return ids;
}
export async function authorizeChat(userId: string, room: unknown) {
  const ids = roomParticipants(room, userId);
  const profiles = await MatrimonyProfile.find({ user: { $in: ids.map(id => new mongoose.Types.ObjectId(id)) }, ownerVerified: true, status: 'approved' });
  if (profiles.length !== 2 || !activeMembership(profiles.find(p => p.user.toString() === userId))) throw new Error('An approved profile and active APEX membership are required.');
  return ids.find(id => id !== userId)!;
}
