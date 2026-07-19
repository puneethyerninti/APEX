"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUsersList = exports.updateApprovalStatus = exports.getPendingApprovals = exports.getDashboardStats = void 0;
const User_1 = __importDefault(require("../models/User"));
const Transaction_1 = __importDefault(require("../models/Transaction"));
const Job_1 = __importDefault(require("../models/Job"));
const MatrimonyProfile_1 = __importDefault(require("../models/MatrimonyProfile"));
const getDashboardStats = async (req, res) => {
    try {
        const totalUsers = await User_1.default.countDocuments();
        const totalTransactions = await Transaction_1.default.countDocuments();
        const pendingJobs = await Job_1.default.countDocuments({ status: 'pending' });
        const pendingProfiles = await MatrimonyProfile_1.default.countDocuments({ status: 'pending' });
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
                pendingProfiles
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
        res.json({ jobs, profiles });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error fetching pending approvals' });
    }
};
exports.getPendingApprovals = getPendingApprovals;
const updateApprovalStatus = async (req, res) => {
    const { type, id, status } = req.body; // type: 'job' | 'profile', status: 'approved' | 'rejected'
    if (!['job', 'profile'].includes(type) || !['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ error: 'Invalid parameters' });
    }
    try {
        if (type === 'job') {
            await Job_1.default.findByIdAndUpdate(id, { status });
        }
        else {
            await MatrimonyProfile_1.default.findByIdAndUpdate(id, { status });
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
        const users = await User_1.default.find({}, 'name phone email walletBalance createdAt');
        res.json({ users });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error fetching users' });
    }
};
exports.getUsersList = getUsersList;
