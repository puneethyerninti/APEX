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
const notificationController_1 = require("./notificationController");
const userController_1 = require("./userController");
const matrimonyController_1 = require("./matrimonyController");
const travelsController_1 = require("./travelsController");
const utilityController_1 = require("./utilityController");
const academyController_1 = require("./academyController");
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
        await (0, notificationController_1.createNotification)(user._id.toString(), 'Payment Successful', `₹${amount} has been deducted from your wallet for ${category || 'payment'}.`, 'success');
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
        await (0, notificationController_1.createNotification)(user._id.toString(), 'Wallet Recharged', `₹${amount} has been added to your wallet.`, 'success');
        res.json({ message: 'Money added successfully', balance: user.walletBalance, transaction });
    }
    catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
};
exports.addMoney = addMoney;
const COURSE_PRICES = {
    'Spoken English': 4999,
    'Spoken Hindi': 3999,
    'Computer Courses': 1200,
    'Competitive Exams': 1500,
    'Full-Stack Web Development': 9999,
    'Data Science & AI/ML': 12499,
    'Mobile App Development': 20000,
    'Digital Marketing Masterclass': 7999,
};
// Razorpay Order Creation (Strict)
const createRazorpayOrder = async (req, res) => {
    let { amount, userId, category = 'add_money', serviceName, metadata } = req.body;
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
        console.error("CRITICAL: Razorpay keys are missing from environment variables.");
        return res.status(500).json({ error: 'Payment gateway is not configured correctly on the server.' });
    }
    if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
    }
    // Ensure course enrollment payments are true to their prices
    if (category === 'academy_enrollment' && metadata?.courseName) {
        const actualPrice = COURSE_PRICES[metadata.courseName];
        if (actualPrice !== undefined) {
            if (amount !== actualPrice) {
                console.warn(`Price mismatch for ${metadata.courseName}. Received: ${amount}, Expected: ${actualPrice}. Overriding to true price.`);
            }
            amount = actualPrice; // Keep it true to its price
        }
        else {
            return res.status(400).json({ error: 'Invalid course selection' });
        }
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
            category: category,
            referenceId: serviceName || 'wallet_topup',
            status: 'pending',
            razorpayOrderId: order.id,
            metadata: metadata || {}
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
                razorpaySignature: razorpay_signature
            }, { new: true });
            if (transaction) {
                let fulfillmentResult = null;
                const metadata = transaction.metadata || {};
                // Secure Server-Side Fulfillment
                try {
                    switch (transaction.category) {
                        case 'add_money':
                            await User_1.default.findByIdAndUpdate(transaction.user, { $inc: { walletBalance: transaction.amount } });
                            break;
                        case 'matrimony':
                            fulfillmentResult = await (0, matrimonyController_1.handleMatrimonyUpgrade)(transaction.user.toString(), metadata.plan || transaction.referenceId?.replace('Matrimony ', '').replace(' Plan', ''));
                            break;
                        case 'subscription':
                            fulfillmentResult = await (0, userController_1.handleAPEXPlanUpgrade)(transaction.user.toString(), metadata.plan || transaction.referenceId);
                            break;
                        case 'travel_booking':
                            fulfillmentResult = await (0, travelsController_1.handleTravelBooking)(transaction.user.toString(), metadata);
                            break;
                        case 'mobile_recharge':
                            fulfillmentResult = await (0, utilityController_1.handleUtilityRecharge)(transaction.user.toString(), metadata);
                            break;
                        case 'academy_enrollment':
                            fulfillmentResult = await (0, academyController_1.handleAcademyEnrollment)(transaction.user.toString(), metadata);
                            break;
                        case 'charity':
                            // Charity just takes money, no fulfillment required
                            break;
                    }
                    // Global success notification
                    await (0, notificationController_1.createNotification)(transaction.user.toString(), 'Payment Successful', `Your payment of ₹${transaction.amount} for ${transaction.referenceId || transaction.category} was successful.`, 'success');
                    const io = req.app.get('io');
                    if (io) {
                        io.to('admin_room').emit('admin_data_refresh', { type: 'new_transaction', data: transaction });
                    }
                    return res.json({ success: true, message: "Payment verified successfully", fulfillmentData: fulfillmentResult, category: transaction.category });
                }
                catch (fulfillmentError) {
                    console.error("Fulfillment failed after successful payment:", fulfillmentError);
                    // NOTE: In a robust production system, if fulfillment fails after payment, you would either queue it for retry or auto-refund the user.
                    return res.status(500).json({ error: 'Payment verified, but failed to deliver service.', details: fulfillmentError.message });
                }
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
