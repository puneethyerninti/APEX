"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.broadcastMessage = exports.getAllLeads = exports.getAllCharityDonations = exports.updateStoreOrderStatus = exports.getAllStoreOrders = exports.completeTransaction = exports.updateUserWallet = exports.deleteEntity = exports.getAllTransactions = exports.getUsersList = exports.updateApprovalStatus = exports.getPendingApprovals = exports.getDashboardStats = void 0;
const User_1 = __importDefault(require("../models/User"));
const Transaction_1 = __importDefault(require("../models/Transaction"));
const Job_1 = __importDefault(require("../models/Job"));
const MatrimonyProfile_1 = __importDefault(require("../models/MatrimonyProfile"));
const RealEstate_1 = __importDefault(require("../models/RealEstate"));
const StoreOrder_1 = __importDefault(require("../models/StoreOrder"));
const CharityDonation_1 = __importDefault(require("../models/CharityDonation"));
const TravelBooking_1 = __importDefault(require("../models/TravelBooking"));
const Lead_1 = __importDefault(require("../models/Lead"));
const Notification_1 = __importDefault(require("../models/Notification"));
const notificationController_1 = require("./notificationController");
const firebaseAdmin_1 = require("../firebaseAdmin");
const getDashboardStats = async (req, res) => {
    try {
        const totalUsers = await User_1.default.countDocuments();
        const totalTransactions = await Transaction_1.default.countDocuments();
        const pendingJobs = await Job_1.default.countDocuments({ status: 'pending' });
        const pendingProfiles = await MatrimonyProfile_1.default.countDocuments({ status: 'pending' });
        const pendingRealty = await RealEstate_1.default.countDocuments({ status: 'pending' });
        const totalTravelBookings = await TravelBooking_1.default.countDocuments();
        // Calculate revenue (sum of all credit transactions, or just an example logic)
        const revenueAgg = await Transaction_1.default.aggregate([
            { $match: { status: 'completed' } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        const revenue = revenueAgg.length > 0 ? revenueAgg[0].total : 0;
        // Revenue History (last 6 months)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
        sixMonthsAgo.setDate(1);
        sixMonthsAgo.setHours(0, 0, 0, 0);
        const historyAgg = await Transaction_1.default.aggregate([
            {
                $match: {
                    status: 'completed',
                    createdAt: { $gte: sixMonthsAgo }
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: "$createdAt" },
                        month: { $month: "$createdAt" }
                    },
                    total: { $sum: "$amount" }
                }
            },
            { $sort: { "_id.year": 1, "_id.month": 1 } }
        ]);
        // Category Distribution
        const categoryAgg = await Transaction_1.default.aggregate([
            { $match: { status: 'completed' } },
            {
                $group: {
                    _id: "$category",
                    total: { $sum: "$amount" },
                    count: { $sum: 1 }
                }
            },
            { $sort: { total: -1 } }
        ]);
        res.json({
            stats: {
                totalUsers,
                totalTransactions,
                revenue,
                pendingJobs,
                pendingProfiles,
                pendingRealty,
                totalTravelBookings,
                revenueHistory: historyAgg,
                categoryDistribution: categoryAgg
            }
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error fetching admin stats' });
    }
};
exports.getDashboardStats = getDashboardStats;
const getPendingApprovals = async (req, res) => {
    try {
        const jobs = await Job_1.default.find({ status: 'pending' }).populate('postedBy', 'name phone');
        const profiles = await MatrimonyProfile_1.default.find({ status: 'pending' }).populate('user', 'name phone');
        const realty = await RealEstate_1.default.find({ status: 'pending' }).populate('ownerId', 'name phone');
        res.json({ jobs, profiles, realty });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error fetching pending approvals' });
    }
};
exports.getPendingApprovals = getPendingApprovals;
const updateApprovalStatus = async (req, res) => {
    const { type, id, status } = req.body; // type: 'job' | 'profile' | 'realty', status: 'approved' | 'rejected'
    if (!['job', 'profile', 'realty'].includes(type) || !['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ error: 'Invalid parameters' });
    }
    try {
        let userIdToNotify;
        let title = '';
        if (type === 'job') {
            const doc = await Job_1.default.findByIdAndUpdate(id, { status });
            if (doc)
                userIdToNotify = doc.postedBy;
            title = `Job ${status === 'approved' ? 'Approved' : 'Rejected'}`;
        }
        else if (type === 'profile') {
            const doc = await MatrimonyProfile_1.default.findByIdAndUpdate(id, { status });
            if (doc)
                userIdToNotify = doc.user;
            title = `Matrimony Profile ${status === 'approved' ? 'Approved' : 'Rejected'}`;
        }
        else if (type === 'realty') {
            const doc = await RealEstate_1.default.findByIdAndUpdate(id, { status });
            if (doc)
                userIdToNotify = doc.ownerId;
            title = `Realty Listing ${status === 'approved' ? 'Approved' : 'Rejected'}`;
        }
        if (userIdToNotify) {
            const notification = await (0, notificationController_1.createNotification)(userIdToNotify.toString(), title, `Your ${type} submission has been ${status} by the admin.`, status === 'approved' ? 'success' : 'error');
            const io = req.app.get('io');
            if (io) {
                io.to(`user_${userIdToNotify}`).emit('new_notification', notification);
            }
        }
        res.json({ message: `${type} successfully ${status}` });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error updating status' });
    }
};
exports.updateApprovalStatus = updateApprovalStatus;
const getUsersList = async (req, res) => {
    try {
        const users = await User_1.default.find({}, 'name phone email walletBalance role createdAt');
        res.json({ users });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error fetching users' });
    }
};
exports.getUsersList = getUsersList;
const getAllTransactions = async (req, res) => {
    try {
        const transactions = await Transaction_1.default.find().populate('user', 'name phone').sort({ createdAt: -1 }).limit(100);
        res.json({ transactions });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error fetching transactions' });
    }
};
exports.getAllTransactions = getAllTransactions;
// Advanced: Delete entities
const deleteEntity = async (req, res) => {
    const { type, id } = req.params;
    try {
        if (type === 'job')
            await Job_1.default.findByIdAndDelete(id);
        else if (type === 'profile')
            await MatrimonyProfile_1.default.findByIdAndDelete(id);
        else if (type === 'realty')
            await RealEstate_1.default.findByIdAndDelete(id);
        else if (type === 'user')
            await User_1.default.findByIdAndDelete(id);
        else
            return res.status(400).json({ error: 'Invalid entity type' });
        res.json({ message: `${type} deleted successfully` });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error deleting entity' });
    }
};
exports.deleteEntity = deleteEntity;
// Advanced: Update User Wallet
const updateUserWallet = async (req, res) => {
    const { id } = req.params;
    const { amount } = req.body;
    try {
        await User_1.default.findByIdAndUpdate(id, { walletBalance: amount });
        res.json({ message: 'Wallet updated successfully' });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error updating wallet' });
    }
};
exports.updateUserWallet = updateUserWallet;
// Manually complete a pending transaction (for razorpay.me verification)
const completeTransaction = async (req, res) => {
    const { id } = req.params;
    try {
        const transaction = await Transaction_1.default.findById(id);
        if (!transaction)
            return res.status(404).json({ error: 'Transaction not found' });
        if (transaction.status === 'completed') {
            return res.status(400).json({ error: 'Transaction is already completed' });
        }
        transaction.status = 'completed';
        await transaction.save();
        res.json({ success: true, message: 'Transaction manually marked as completed' });
    }
    catch (error) {
        console.error('Error completing transaction manually:', error);
        res.status(500).json({ error: 'Server error' });
    }
};
exports.completeTransaction = completeTransaction;
// Get all store orders
const getAllStoreOrders = async (req, res) => {
    try {
        const orders = await StoreOrder_1.default.find().populate('userId', 'name phone').sort({ createdAt: -1 });
        res.json({ orders });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error fetching store orders' });
    }
};
exports.getAllStoreOrders = getAllStoreOrders;
// Update store order status
const updateStoreOrderStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    if (!['pending', 'shipped', 'delivered', 'cancelled'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
    }
    try {
        const order = await StoreOrder_1.default.findByIdAndUpdate(id, { status }, { new: true });
        if (!order)
            return res.status(404).json({ error: 'Order not found' });
        // Send real-time notification
        const notification = await (0, notificationController_1.createNotification)(order.userId.toString(), `Order ${status.charAt(0).toUpperCase() + status.slice(1)}`, `Your store order has been marked as ${status}.`, 'info');
        const io = req.app.get('io');
        if (io) {
            io.to(`user_${order.userId}`).emit('new_notification', notification);
        }
        res.json({ success: true, order });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error updating order status' });
    }
};
exports.updateStoreOrderStatus = updateStoreOrderStatus;
// Get all charity donations
const getAllCharityDonations = async (req, res) => {
    try {
        const donations = await CharityDonation_1.default.find().populate('userId', 'name phone').sort({ createdAt: -1 });
        res.json({ donations });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error fetching charity donations' });
    }
};
exports.getAllCharityDonations = getAllCharityDonations;
// Get all leads
const getAllLeads = async (req, res) => {
    try {
        const leads = await Lead_1.default.find().sort({ createdAt: -1 });
        res.json({ leads });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error fetching leads' });
    }
};
exports.getAllLeads = getAllLeads;
// Global Broadcast Message
const broadcastMessage = async (req, res) => {
    const { title, message, type } = req.body;
    if (!title || !message) {
        return res.status(400).json({ error: 'Title and message are required' });
    }
    try {
        // 1. Fetch all users to create DB notifications and get FCM tokens
        const users = await User_1.default.find({}, '_id fcmTokens');
        // 2. Prepare notifications for DB
        const notificationsToInsert = users.map(user => ({
            user: user._id,
            title,
            message,
            type: type || 'info',
            isRead: false
        }));
        if (notificationsToInsert.length > 0) {
            await Notification_1.default.insertMany(notificationsToInsert);
        }
        // 3. Emit real-time event to active connected clients
        const io = req.app.get('io');
        if (io) {
            io.emit('global_notification', {
                _id: new Date().getTime().toString(), // Client sees this until refresh
                title,
                message,
                type: type || 'info',
                createdAt: new Date().toISOString(),
                isRead: false
            });
        }
        // 4. Send Push Notifications in background
        const allTokens = users.reduce((acc, user) => {
            if (user.fcmTokens && user.fcmTokens.length > 0) {
                return acc.concat(user.fcmTokens);
            }
            return acc;
        }, []);
        if (allTokens.length > 0) {
            (0, firebaseAdmin_1.sendPushNotification)(allTokens, title, message).catch(err => console.error('Broadcast push failed:', err));
        }
        res.json({ success: true, message: 'Broadcast sent to all active users and saved to database' });
    }
    catch (error) {
        console.error('Error broadcasting message:', error);
        res.status(500).json({ error: 'Server error' });
    }
};
exports.broadcastMessage = broadcastMessage;
