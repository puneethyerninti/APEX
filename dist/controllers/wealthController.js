"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logInvestIntent = exports.seedMutualFunds = exports.getMarketData = void 0;
const notificationController_1 = require("./notificationController");
const User_1 = __importDefault(require("../models/User"));
const MutualFund_1 = __importDefault(require("../models/MutualFund"));
const getMarketData = async (req, res) => {
    try {
        const mutualFunds = await MutualFund_1.default.find({}).lean();
        res.json({
            success: true,
            message: "Market data fetched successfully",
            timestamp: new Date().toISOString(),
            data: {
                mutualFunds
            }
        });
    }
    catch (error) {
        console.error('Error fetching market data:', error);
        res.status(500).json({ error: 'Server error fetching market data' });
    }
};
exports.getMarketData = getMarketData;
const seedMutualFunds = async (req, res) => {
    const initialFunds = [
        {
            id: "MF_001",
            name: "HDFC Small Cap Fund",
            category: "Equity - Small Cap",
            nav: 124.56,
            oneYearReturn: 34.2,
            threeYearReturn: 28.5,
            minSipAmount: 500,
            riskLevel: "Very High",
            fundHouse: "HDFC Mutual Fund"
        },
        {
            id: "MF_002",
            name: "SBI Bluechip Fund",
            category: "Equity - Large Cap",
            nav: 89.32,
            oneYearReturn: 18.4,
            threeYearReturn: 15.2,
            minSipAmount: 1000,
            riskLevel: "High",
            fundHouse: "SBI Mutual Fund"
        },
        {
            id: "MF_003",
            name: "ICICI Prudential Liquid Fund",
            category: "Debt - Liquid",
            nav: 345.12,
            oneYearReturn: 6.8,
            threeYearReturn: 5.9,
            minSipAmount: 100,
            riskLevel: "Low",
            fundHouse: "ICICI Prudential Mutual Fund"
        },
        {
            id: "MF_004",
            name: "Parag Parikh Flexi Cap Fund",
            category: "Equity - Flexi Cap",
            nav: 72.84,
            oneYearReturn: 24.1,
            threeYearReturn: 21.3,
            minSipAmount: 1000,
            riskLevel: "High",
            fundHouse: "PPFAS Mutual Fund"
        }
    ];
    try {
        // Prevent double seeding
        const count = await MutualFund_1.default.countDocuments();
        if (count > 0) {
            return res.status(400).json({ message: 'Mutual funds already seeded', count });
        }
        await MutualFund_1.default.insertMany(initialFunds);
        res.json({ success: true, message: 'Seeded successfully' });
    }
    catch (error) {
        console.error('Seed error:', error);
        res.status(500).json({ error: 'Failed to seed mutual funds' });
    }
};
exports.seedMutualFunds = seedMutualFunds;
const logInvestIntent = async (req, res) => {
    const { userId, amcName } = req.body;
    if (!userId || !amcName) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    try {
        const user = await User_1.default.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        await (0, notificationController_1.createNotification)(userId, 'Redirecting to Partner', `You are being securely redirected to ${amcName} to complete your investment.`, 'info');
        res.json({ success: true, message: 'Intent logged' });
    }
    catch (error) {
        console.error('Error logging invest intent:', error);
        res.status(500).json({ error: 'Server error' });
    }
};
exports.logInvestIntent = logInvestIntent;
