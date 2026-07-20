"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateUserWallet = exports.deleteEntity = exports.getAllTransactions = exports.getUsersList = exports.updateApprovalStatus = exports.getPendingApprovals = exports.getDashboardStats = void 0;
const User_1 = __importDefault(require("../models/User"));
const Transaction_1 = __importDefault(require("../models/Transaction"));
const Job_1 = __importDefault(require("../models/Job"));
const MatrimonyProfile_1 = __importDefault(require("../models/MatrimonyProfile"));
const RealEstate_1 = __importDefault(require("../models/RealEstate"));
const getDashboardStats = async (req, res) => {
    try {
        const totalUsers = await User_1.default.countDocuments();
        const totalTransactions = await Transaction_1.default.countDocuments();
        const pendingJobs = await Job_1.default.countDocuments({ status: 'pending' });
        const pendingProfiles = await MatrimonyProfile_1.default.countDocuments({ status: 'pending' });
        const pendingRealty = await RealEstate_1.default.countDocuments({ status: 'pending' });
        // Calculate revenue (sum of all credit transactions, or just an example logic)
        const revenueAgg = await Transaction_1.default.aggregate([
            { $match: { status: 'completed' } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        const revenue = revenueAgg.length > 0 ? revenueAgg[0].total : 0;
        res.json({
            stats: {
                totalUsers,
                totalTransactions,
                revenue,
                pendingJobs,
                pendingProfiles,
                pendingRealty
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
        if (type === 'job') {
            await Job_1.default.findByIdAndUpdate(id, { status });
        }
        else if (type === 'profile') {
            await MatrimonyProfile_1.default.findByIdAndUpdate(id, { status });
        }
        else if (type === 'realty') {
            await RealEstate_1.default.findByIdAndUpdate(id, { status });
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
        const transactions = await Transaction_1.default.find().populate('userId', 'name phone').sort({ createdAt: -1 }).limit(100);
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
