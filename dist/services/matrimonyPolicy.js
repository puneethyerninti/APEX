"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.activeMembership = exports.normalizePlan = exports.matrimonyPlans = void 0;
exports.roomParticipants = roomParticipants;
exports.authorizeChat = authorizeChat;
const mongoose_1 = __importDefault(require("mongoose"));
const MatrimonyProfile_1 = __importDefault(require("../models/MatrimonyProfile"));
exports.matrimonyPlans = {
    Silver: { amount: 5000, months: 3 }, Gold: { amount: 10000, months: 6 }, Diamond: { amount: 20000, months: 12 }
};
const normalizePlan = (value) => {
    const plan = typeof value === 'string' ? value.replace(/^Matrimony /, '').replace(/ Plan$/, '') : '';
    const normalized = plan === 'Premium' ? 'Diamond' : plan;
    return ['Silver', 'Gold', 'Diamond'].includes(normalized) ? normalized : '';
};
exports.normalizePlan = normalizePlan;
const activeMembership = (profile) => profile?.status === 'approved' && profile.subscription?.isActive === true &&
    profile.subscription.expiresAt && new Date(profile.subscription.expiresAt).getTime() > Date.now();
exports.activeMembership = activeMembership;
function roomParticipants(room, userId) {
    if (typeof room !== 'string' || !/^match_[a-f0-9]{24}_[a-f0-9]{24}$/.test(room))
        throw new Error('Invalid chat room.');
    const ids = room.slice(6).split('_');
    if (!ids.includes(userId) || ids[0] === ids[1] || ids.join('_') !== [...ids].sort().join('_'))
        throw new Error('Chat access denied.');
    return ids;
}
async function authorizeChat(userId, room) {
    const ids = roomParticipants(room, userId);
    const profiles = await MatrimonyProfile_1.default.find({ user: { $in: ids.map(id => new mongoose_1.default.Types.ObjectId(id)) }, ownerVerified: true, status: 'approved' });
    if (profiles.length !== 2 || !(0, exports.activeMembership)(profiles.find(p => p.user.toString() === userId)))
        throw new Error('An approved profile and active APEX membership are required.');
    return ids.find(id => id !== userId);
}
