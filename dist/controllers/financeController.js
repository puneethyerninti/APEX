"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyRazorpayPayment = exports.createRazorpayOrder = exports.addMoney = exports.deductMoney = exports.getWalletBalance = void 0;
const User_1 = __importDefault(require("../models/User"));
const Transaction_1 = __importDefault(require("../models/Transaction"));
const razorpay_1 = __importDefault(require("razorpay"));
const crypto_1 = __importDefault(require("crypto"));
const razorpay = new razorpay_1.default({
    key_id: process.env.RAZORPAY_KEY_ID || 'mock_key',
    key_secret: process.env.RAZORPAY_KEY_SECRET || 'mock_secret',
});
// Note: In a real app, you would have middleware extracting user ID from JWT
// For this stage, we simulate passing userId in the body or finding the first user
const getWalletBalance = async (req, res) => {
    try {
        const user = await User_1.default.findOne(); // Grab the first user for demo
        if (!user)
            return res.status(404).json({ error: 'User not found' });
        res.json({ balance: user.walletBalance });
    }
    catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
};
exports.getWalletBalance = getWalletBalance;
const deductMoney = async (req, res) => {
    const { amount, category } = req.body;
    try {
        const user = await User_1.default.findOne();
        if (!user)
            return res.status(404).json({ error: 'User not found' });
        if (user.walletBalance < amount) {
            return res.status(400).json({ error: 'Insufficient balance' });
        }
        user.walletBalance -= amount;
        await user.save();
        const transaction = await Transaction_1.default.create({
            user: user._id,
            amount,
            type: 'debit',
            category: category || 'payment',
            status: 'completed',
        });
        res.json({ message: 'Payment successful', balance: user.walletBalance, transaction });
    }
    catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
};
exports.deductMoney = deductMoney;
const addMoney = async (req, res) => {
    const { amount } = req.body;
    try {
        const user = await User_1.default.findOne();
        if (!user)
            return res.status(404).json({ error: 'User not found' });
        user.walletBalance += amount;
        await user.save();
        const transaction = await Transaction_1.default.create({
            user: user._id,
            amount,
            type: 'credit',
            category: 'add_money',
            status: 'completed',
        });
        res.json({ message: 'Money added successfully', balance: user.walletBalance, transaction });
    }
    catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
};
exports.addMoney = addMoney;
// Razorpay Order Creation (Hybrid)
const createRazorpayOrder = async (req, res) => {
    const { amount } = req.body; // Amount in INR
    // MOCK BYPASS: If no key is present
    if (!process.env.RAZORPAY_KEY_ID) {
        return res.json({
            mockMode: true,
            order: { id: `mock_order_${Date.now()}`, amount: amount * 100, currency: 'INR' }
        });
    }
    try {
        const options = {
            amount: Math.round(amount * 100), // convert to paise
            currency: "INR",
            receipt: `receipt_${Date.now()}`
        };
        const order = await razorpay.orders.create(options);
        res.json({ mockMode: false, order, keyId: process.env.RAZORPAY_KEY_ID });
    }
    catch (error) {
        console.error("Razorpay Error:", error);
        res.status(500).json({ error: 'Failed to create order' });
    }
};
exports.createRazorpayOrder = createRazorpayOrder;
// Razorpay Payment Verification (Hybrid)
const verifyRazorpayPayment = async (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, amount, userId } = req.body;
    // MOCK BYPASS
    if (!process.env.RAZORPAY_KEY_ID) {
        try {
            const user = await User_1.default.findOne();
            if (user) {
                user.walletBalance += amount;
                await user.save();
                await Transaction_1.default.create({
                    user: user._id,
                    amount,
                    type: 'credit',
                    category: 'add_money',
                    status: 'completed',
                });
            }
            return res.json({ success: true, message: "Mock Payment Verified & Wallet Updated" });
        }
        catch (e) {
            return res.status(500).json({ error: 'Mock update failed' });
        }
    }
    // REAL VERIFICATION
    try {
        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto_1.default
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest("hex");
        const isAuthentic = expectedSignature === razorpay_signature;
        if (isAuthentic) {
            // Credit wallet
            const user = await User_1.default.findOne(); // In production, fetch by userId
            if (user) {
                user.walletBalance += amount;
                await user.save();
                await Transaction_1.default.create({
                    user: user._id,
                    amount,
                    type: 'credit',
                    category: 'add_money',
                    status: 'completed',
                });
            }
            res.json({ success: true, message: "Payment verified successfully" });
        }
        else {
            res.status(400).json({ success: false, error: "Invalid signature" });
        }
    }
    catch (error) {
        res.status(500).json({ error: 'Server error during verification' });
    }
};
exports.verifyRazorpayPayment = verifyRazorpayPayment;
