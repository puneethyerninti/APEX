"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyRazorpayPayment = exports.createRazorpayOrder = exports.getMyQrPayload = exports.getUserTransactions = exports.payMerchantWithWallet = exports.withdrawToBank = exports.transferMoney = exports.addMoney = exports.deductMoney = exports.getWalletBalance = exports.resolveUser = exports.getRazorpay = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const User_1 = __importDefault(require("../models/User"));
const Transaction_1 = __importDefault(require("../models/Transaction"));
const razorpay_1 = __importDefault(require("razorpay"));
const crypto_1 = __importDefault(require("crypto"));
const fulfillmentService_1 = require("../services/fulfillmentService");
const utilityController_1 = require("./utilityController");
const Course_1 = __importDefault(require("../models/Course"));
const WalletTransfer_1 = __importDefault(require("../models/WalletTransfer"));
const MatrimonyProfile_1 = __importDefault(require("../models/MatrimonyProfile"));
const matrimonyPolicy_1 = require("../services/matrimonyPolicy");
// Razorpay will be instantiated dynamically to avoid crashing the server on startup if keys are missing
let razorpayInstance = null;
const getRazorpay = () => {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
        throw new Error("Razorpay keys missing");
    }
    if (!razorpayInstance) {
        razorpayInstance = new razorpay_1.default({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET,
        });
    }
    return razorpayInstance;
};
exports.getRazorpay = getRazorpay;
/**
 * Strict user resolution utility for production finance operations.
 * Extracts user from JWT auth token, query params, or body payload.
 */
const resolveUser = async (req) => {
    const id = req.user?.id;
    return id && mongoose_1.default.isValidObjectId(String(id)) ? User_1.default.findById(id) : null;
};
exports.resolveUser = resolveUser;
/**
 * GET /api/finance/wallet
 * Returns real-time wallet balance for the authenticated user.
 */
const getWalletBalance = async (req, res) => {
    try {
        const user = await (0, exports.resolveUser)(req);
        if (!user) {
            return res.status(401).json({ success: false, error: 'Authentication required. Please login.' });
        }
        res.json({
            success: true,
            balance: user.walletBalance || 0,
            user: {
                _id: user._id,
                name: user.name,
                phone: user.phone,
                email: user.email
            }
        });
    }
    catch (error) {
        console.error('getWalletBalance Error:', error);
        res.status(500).json({ success: false, error: 'Server error retrieving wallet balance' });
    }
};
exports.getWalletBalance = getWalletBalance;
// Retained endpoints protect cached clients without changing historical balances.
const deductMoney = async (_req, res) => res.status(409).json({ success: false, error: 'Wallet spending is paused. Your stored balance has not changed.' });
exports.deductMoney = deductMoney;
const addMoney = async (_req, res) => res.status(409).json({ success: false, error: 'New wallet deposits are paused. Pay recipients directly in your UPI app.' });
exports.addMoney = addMoney;
// An old uncertain send can check its committed receipt, never create a new transfer.
const transferMoney = async (req, res) => {
    const amount = Number(req.body.amount);
    const rawAmount = String(req.body.amount);
    const recipientPhone = String(req.body.recipientPhone || '').replace(/[\s()-]/g, '').replace(/^\+91/, '');
    const key = String(req.body.idempotencyKey || '');
    const note = String(req.body.note || '').trim().slice(0, 250);
    if (!/^\d+(\.\d{1,2})?$/.test(rawAmount) || !Number.isFinite(amount) || amount < 0.01 || amount > 100000 ||
        !/^[6-9]\d{9}$/.test(recipientPhone) || !/^[a-zA-Z0-9-]{16,80}$/.test(key)) {
        return res.status(400).json({ error: 'Valid mobile, amount and earlier transfer reference required.' });
    }
    try {
        const existing = await WalletTransfer_1.default.findOne({ user: req.user.id, key });
        if (existing) {
            if (existing.amount !== amount || existing.recipientPhone !== recipientPhone || existing.note !== note)
                return res.status(409).json({ error: 'Transfer reference already used for different details.' });
            if (!existing.result?.success)
                return res.status(409).json({ error: 'The earlier transfer requires support reconciliation. Your balance has not been changed by this request.' });
            const { recipientBalance: _privateBalance, ...receipt } = existing.result;
            return res.json(receipt);
        }
        return res.status(409).json({ success: false, code: 'WALLET_TRANSFERS_PAUSED', error: 'No completed transfer was found for this reference. New wallet transfers are paused. Your balance has not been changed by this request.' });
    }
    catch {
        return res.status(503).json({ success: false, error: 'Earlier transfer receipt is temporarily unavailable. Do not send again; check history or contact support.' });
    }
};
exports.transferMoney = transferMoney;
/**
 * POST /api/finance/wallet/withdraw
 * RazorpayX Payouts Integration
 */
const withdrawToBank = async (_req, res) => {
    return res.status(503).json({ success: false, error: 'External wallet payouts are not enabled for this app. Standard Razorpay checkout collects money; it does not send your wallet balance to bank or UPI accounts. Your balance has not changed.' });
};
exports.withdrawToBank = withdrawToBank;
/**
 * POST /api/finance/wallet/pay-merchant
 * Direct QR scan & pay using wallet balance.
 */
const payMerchantWithWallet = async (req, res) => {
    return res.status(503).json({ success: false, error: 'Merchant wallet payments are unavailable. Use your UPI app to pay the merchant.' });
};
exports.payMerchantWithWallet = payMerchantWithWallet;
/**
 * GET /api/finance/transactions
 * Passbook ledger endpoint with pagination and category filtering.
 */
const getUserTransactions = async (req, res) => {
    try {
        const user = await (0, exports.resolveUser)(req);
        if (!user) {
            return res.status(401).json({ success: false, error: 'Authentication required' });
        }
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
        const skip = (page - 1) * limit;
        const filter = { user: user._id };
        if (req.query.type && ['credit', 'debit'].includes(req.query.type)) {
            filter.type = req.query.type;
        }
        if (req.query.category) {
            filter.category = req.query.category;
        }
        const [transactions, total] = await Promise.all([
            Transaction_1.default.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Transaction_1.default.countDocuments(filter)
        ]);
        res.json({
            success: true,
            transactions,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    }
    catch (error) {
        console.error('getUserTransactions Error:', error);
        res.status(500).json({ success: false, error: 'Server error fetching passbook transactions' });
    }
};
exports.getUserTransactions = getUserTransactions;
const getMyQrPayload = async (_req, res) => res.status(409).json({ success: false, error: 'APEX wallet receive QRs are retired. Use your bank-issued UPI ID or QR.' });
exports.getMyQrPayload = getMyQrPayload;
const isUtilityCategory = (category) => ['mobile_recharge', 'bbps_payment'].includes(category);
const scheduleUtilityFulfillment = async (transaction, io) => {
    const metadata = transaction.metadata || {};
    const queued = await Transaction_1.default.findOneAndUpdate({ _id: transaction._id, 'metadata.fulfillmentQueued': { $ne: true }, 'metadata.fulfilled': { $ne: true } }, {
        $set: {
            'metadata.fulfillmentQueued': true,
            'metadata.fulfillmentQueuedAt': new Date()
        }
    }, { new: true });
    if (!queued) {
        return;
    }
    const utilityTransactionId = metadata.utilityTransactionId;
    if (utilityTransactionId) {
        await (0, utilityController_1.updateUtilityTransactionStatus)(utilityTransactionId, 'fulfillment_pending', 'Payment received. Utility service is processing.', {
            razorpayPaymentId: transaction.razorpayPaymentId,
            razorpayOrderId: transaction.razorpayOrderId
        }, io);
    }
    setImmediate(async () => {
        try {
            await (0, fulfillmentService_1.fulfillOrder)(queued, io);
        }
        catch (error) {
            console.error(`[Utility Fulfillment] Async fulfillment failed for ${queued._id}:`, error);
        }
    });
};
// Razorpay Order Creation (Strict)
const createRazorpayOrder = async (req, res) => {
    let { amount, userId, category, serviceName, metadata } = req.body;
    if (['add_money', 'wallet_recharge'].includes(category))
        return res.status(409).json({ error: 'New wallet deposits are paused. Your existing balance remains recorded. Pay personal recipients directly in your UPI app.' });
    if (typeof category !== 'string' || !category)
        return res.status(400).json({ error: 'Select a supported APEX service before checkout.' });
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
        console.error("CRITICAL: Razorpay keys are missing from environment variables.");
        return res.status(500).json({ error: 'Payment gateway is not configured correctly on the server.' });
    }
    const user = await (0, exports.resolveUser)(req);
    if (!user)
        return res.status(401).json({ error: 'Please login to make a payment.' });
    userId = user._id;
    const amountText = String(amount);
    amount = Number(amount);
    if (!/^\d+(\.\d{1,2})?$/.test(amountText) || !Number.isFinite(amount) || amount < 0.01 || amount > 100000 || !Number.isSafeInteger(Math.round(amount * 100))) {
        return res.status(400).json({ error: 'Enter a valid payment amount.' });
    }
    const supportedCategories = ['mobile_recharge', 'bbps_payment', 'matrimony', 'subscription', 'academy_enrollment', 'charity'];
    if (!supportedCategories.includes(category)) {
        return res.status(400).json({ error: 'This payment service is unavailable. Pay external merchants using your UPI app.' });
    }
    const reservedMetadata = new Set(['fulfilled', 'fulfilledAt', 'fulfillmentResult', 'fulfillmentError', 'fulfillmentFailedAt', 'fulfillmentQueued', 'fulfillmentQueuedAt', 'fulfillmentInProgress', 'fulfillmentStartedAt', 'refundInfo', 'utilityTransactionId']);
    metadata = Object.fromEntries(Object.entries(metadata && typeof metadata === 'object' && !Array.isArray(metadata) ? metadata : {})
        .filter(([key]) => !reservedMetadata.has(key)));
    if (category === 'matrimony') {
        const plan = (0, matrimonyPolicy_1.normalizePlan)(metadata.plan);
        if (!matrimonyPolicy_1.matrimonyPlans[plan])
            return res.status(400).json({ error: 'Select a valid matrimony membership.' });
        const profile = await MatrimonyProfile_1.default.findOne({ user: userId, ownerVerified: true, status: 'approved' });
        if (!profile)
            return res.status(409).json({ error: 'Create your APEX profile and wait for approval before buying membership.' });
        amount = matrimonyPolicy_1.matrimonyPlans[plan].amount;
        metadata = { plan };
    }
    // Ensure course enrollment payments are true to their prices
    if (category === 'academy_enrollment' && metadata?.courseName) {
        const course = await Course_1.default.findOne({ title: metadata.courseName, status: 'active' });
        if (course) {
            const actualPrice = course.price;
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
        const order = await (0, exports.getRazorpay)().orders.create(options);
        const utilityTransaction = await (0, utilityController_1.createPendingUtilityTransaction)(userId, category, amount, metadata || {}, order.id);
        // Create pending transaction
        await Transaction_1.default.create({
            user: userId,
            amount,
            type: 'debit',
            category: category,
            referenceId: serviceName || category,
            status: 'pending',
            razorpayOrderId: order.id,
            metadata: {
                ...(metadata || {}),
                ...(utilityTransaction ? {
                    utilityTransactionId: utilityTransaction._id.toString(),
                    client_ref_id: utilityTransaction.clientRefId
                } : {})
            }
        });
        res.json({
            order,
            keyId: process.env.RAZORPAY_KEY_ID,
            utilityTransactionId: utilityTransaction?._id
        });
    }
    catch (error) {
        console.error("Razorpay Error:", error);
        res.status(500).json({ error: 'Failed to create order' });
    }
};
exports.createRazorpayOrder = createRazorpayOrder;
// Razorpay Payment Verification (Strict)
const verifyRazorpayPayment = async (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
        return res.status(503).json({ error: 'Payment gateway configuration missing' });
    }
    if (![razorpay_order_id, razorpay_payment_id, razorpay_signature].every(value => typeof value === 'string' && value.length > 0)) {
        return res.status(400).json({ success: false, error: 'Payment verification details are required.' });
    }
    try {
        const user = await (0, exports.resolveUser)(req);
        if (!user)
            return res.status(401).json({ error: 'Please login to verify payment.' });
        let transaction = await Transaction_1.default.findOne({ razorpayOrderId: razorpay_order_id, user: user._id });
        if (!transaction)
            return res.status(404).json({ success: false, error: 'Payment order not found.' });
        const expected = crypto_1.default.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(transaction.razorpayOrderId + '|' + razorpay_payment_id).digest('hex');
        if (!/^[a-f0-9]{64}$/i.test(razorpay_signature) ||
            !crypto_1.default.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(razorpay_signature, 'hex'))) {
            return res.status(400).json({ success: false, error: 'Invalid payment signature.' });
        }
        const payment = await (0, exports.getRazorpay)().payments.fetch(razorpay_payment_id);
        if (payment.order_id !== transaction.razorpayOrderId ||
            Number(payment.amount) !== Math.round(transaction.amount * 100) || payment.currency !== 'INR') {
            return res.status(400).json({ success: false, error: 'Payment does not match this order.' });
        }
        if (Number(payment.amount_refunded || 0) > 0) {
            return res.status(409).json({ success: false, error: 'Refunded payment requires support review.' });
        }
        if (payment.status !== 'captured') {
            return res.status(409).json({ success: false, status: 'payment_pending', error: 'Payment has not been captured yet. Please check your payment history shortly.' });
        }
        if (transaction.status === 'refunded' || transaction.metadata?.fulfillmentError) {
            return res.status(409).json({ success: false, status: transaction.status, error: 'This payment needs support review or has been refunded.' });
        }
        const captured = await Transaction_1.default.findOneAndUpdate({ _id: transaction._id, status: { $in: ['pending', 'failed'] }, 'metadata.fulfillmentError': { $exists: false } }, { $set: { status: 'completed', razorpayPaymentId: razorpay_payment_id, razorpaySignature: razorpay_signature } }, { new: true });
        transaction = captured || await Transaction_1.default.findById(transaction._id);
        if (!transaction || transaction.status !== 'completed' || transaction.razorpayPaymentId !== razorpay_payment_id) {
            return res.status(409).json({ success: false, error: 'Payment is awaiting reconciliation.' });
        }
        if (isUtilityCategory(transaction.category)) {
            await scheduleUtilityFulfillment(transaction, req.app.get('io'));
            return res.json({ success: true, category: transaction.category,
                utilityTransactionId: transaction.metadata?.utilityTransactionId, status: 'fulfillment_pending' });
        }
        const fulfillmentData = await (0, fulfillmentService_1.fulfillOrder)(transaction, req.app.get('io'));
        return res.json({ success: true, category: transaction.category, fulfillmentData,
            message: 'Payment verified and service delivered.' });
    }
    catch (error) {
        console.error('Payment verification failed:', error.message);
        return res.status(500).json({ success: false, error: 'Payment confirmation is delayed. Check payment history before paying again.' });
    }
};
exports.verifyRazorpayPayment = verifyRazorpayPayment;
