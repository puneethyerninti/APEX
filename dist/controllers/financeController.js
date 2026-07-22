"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordMockTransaction = exports.verifyRazorpayPayment = exports.createRazorpayOrder = exports.addMoney = exports.deductMoney = exports.getWalletBalance = void 0;
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
// Razorpay Order Creation (Strict)
const createRazorpayOrder = async (req, res) => {
    const { amount, userId } = req.body;
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
        return res.status(500).json({ error: 'Payment gateway configuration missing' });
    }
    if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
    }
    try {
        const options = {
            amount: Math.round(amount * 100), // convert to paise
            currency: "INR",
            receipt: `receipt_${Date.now()}`
        };
        const order = await razorpay.orders.create(options);
        // Create pending transaction
        await Transaction_1.default.create({
            user: userId,
            amount,
            type: 'credit',
            category: 'add_money',
            status: 'pending',
            razorpayOrderId: order.id
        });
        res.json({ order, keyId: process.env.RAZORPAY_KEY_ID });
    }
    catch (error) {
        console.error("Razorpay Error:", error);
        res.status(500).json({ error: 'Failed to create order' });
    }
};
exports.createRazorpayOrder = createRazorpayOrder;
// Razorpay Payment Verification (Strict)
const verifyRazorpayPayment = async (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, amount, userId } = req.body;
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
        return res.status(500).json({ error: 'Payment gateway configuration missing' });
    }
    try {
        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto_1.default
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest("hex");
        const isAuthentic = expectedSignature === razorpay_signature;
        if (isAuthentic) {
            // Idempotency: Find the pending transaction and mark it completed
            const transaction = await Transaction_1.default.findOneAndUpdate({ razorpayOrderId: razorpay_order_id, status: 'pending' }, {
                status: 'completed',
                razorpayPaymentId: razorpay_payment_id,
                razorpaySignature: razorpay_signature,
                referenceId: razorpay_payment_id
            }, { new: true });
            if (transaction) {
                // Credit wallet only if transaction was pending and is now completed
                await User_1.default.findByIdAndUpdate(transaction.user, {
                    $inc: { walletBalance: transaction.amount }
                });
                return res.json({ success: true, message: "Payment verified successfully" });
            }
            else {
                // Transaction was already completed or not found
                return res.json({ success: true, message: "Payment already verified" });
            }
        }
        else {
            res.status(400).json({ success: false, error: "Invalid signature" });
        }
    }
    catch (error) {
        console.error("Verification error:", error);
        res.status(500).json({ error: 'Server error during verification' });
    }
};
exports.verifyRazorpayPayment = verifyRazorpayPayment;
// Record Mock Transaction for razorpay.me redirects
const recordMockTransaction = async (req, res) => {
    const { amount, userId, category, serviceName } = req.body;
    if (!userId || !amount) {
        return res.status(400).json({ error: 'Missing userId or amount' });
    }
    try {
        const user = await User_1.default.findById(userId);
        if (!user)
            return res.status(404).json({ error: 'User not found' });
        // Create pending transaction for admin tracking
        await Transaction_1.default.create({
            user: userId,
            amount,
            type: 'debit',
            category: category || 'service_payment',
            status: 'pending',
            referenceId: `mock_${Date.now()}`
        });
        res.json({ success: true, message: 'Pending transaction recorded for verification' });
    }
    catch (error) {
        console.error('Error recording mock transaction:', error);
        res.status(500).json({ error: 'Server error' });
    }
};
exports.recordMockTransaction = recordMockTransaction;
