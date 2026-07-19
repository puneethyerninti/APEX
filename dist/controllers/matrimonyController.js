"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getInbox = exports.markMessagesAsRead = exports.getMessages = exports.createProfile = exports.getProfiles = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const MatrimonyProfile_1 = __importDefault(require("../models/MatrimonyProfile"));
const Message_1 = __importDefault(require("../models/Message"));
const User_1 = __importDefault(require("../models/User"));
// Get all approved profiles
const getProfiles = async (req, res) => {
    try {
        const { userId } = req.query;
        const query = { status: 'approved' };
        if (userId && userId !== 'undefined') {
            query.user = { $ne: userId };
        }
        const profiles = await MatrimonyProfile_1.default.find(query).populate('user', 'name phone');
        res.json(profiles);
    }
    catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
};
exports.getProfiles = getProfiles;
// Create a profile
const createProfile = async (req, res) => {
    try {
        const { userId, age, height, religion, profession, location, bio } = req.body;
        // Check if profile exists
        const existing = await MatrimonyProfile_1.default.findOne({ user: userId });
        if (existing) {
            return res.status(400).json({ error: 'Profile already exists for this user' });
        }
        const newProfile = await MatrimonyProfile_1.default.create({
            user: userId,
            age,
            height,
            religion,
            profession,
            location,
            bio,
            images: [] // Handle image uploads in real implementation
        });
        // Emit live event to admin dashboard
        const io = req.app.get('io');
        if (io) {
            io.to('admin_room').emit('admin_data_refresh');
        }
        res.status(201).json(newProfile);
    }
    catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
};
exports.createProfile = createProfile;
// Get chat messages for a specific room
const getMessages = async (req, res) => {
    const { roomId } = req.params;
    try {
        const messages = await Message_1.default.find({ roomId }).sort({ timestamp: 1 });
        res.json(messages);
    }
    catch (error) {
        res.status(500).json({ error: 'Server error fetching messages' });
    }
};
exports.getMessages = getMessages;
// Mark messages as read
const markMessagesAsRead = async (req, res) => {
    const { roomId } = req.params;
    const { userId } = req.body; // The user who is reading the messages
    try {
        // Update all messages in this room sent TO this user as read
        await Message_1.default.updateMany({ roomId, receiverId: userId, isRead: false }, { $set: { isRead: true } });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Server error marking messages as read' });
    }
};
exports.markMessagesAsRead = markMessagesAsRead;
// Get inbox for a user
const getInbox = async (req, res) => {
    const { userId } = req.params;
    try {
        const messages = await Message_1.default.find({ $or: [{ senderId: userId }, { receiverId: userId }] })
            .sort({ timestamp: -1 });
        const inboxMap = new Map();
        for (const msg of messages) {
            if (!inboxMap.has(msg.roomId)) {
                const otherUserId = msg.senderId === userId ? msg.receiverId : msg.senderId;
                if (mongoose_1.default.Types.ObjectId.isValid(otherUserId)) {
                    let otherProfile = await MatrimonyProfile_1.default.findOne({ user: otherUserId }).populate('user', 'name phone');
                    if (!otherProfile) {
                        const fallbackUser = await User_1.default.findById(otherUserId);
                        if (fallbackUser) {
                            otherProfile = {
                                user: fallbackUser,
                                images: fallbackUser.profilePicture ? [fallbackUser.profilePicture] : []
                            };
                        }
                    }
                    if (otherProfile) {
                        inboxMap.set(msg.roomId, {
                            latestMessage: msg,
                            profile: otherProfile
                        });
                    }
                }
            }
        }
        const inbox = Array.from(inboxMap.values());
        res.json(inbox);
    }
    catch (error) {
        res.status(500).json({ error: 'Server error fetching inbox' });
    }
};
exports.getInbox = getInbox;
