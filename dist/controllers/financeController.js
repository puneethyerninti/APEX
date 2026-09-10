"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyRazorpayPayment = exports.createRazorpayOrder = exports.getMyQrPayload = exports.getUserTransactions = exports.payMerchantWithWallet = exports.transferMoney = exports.addMoney = exports.deductMoney = exports.getWalletBalance = exports.resolveUser = exports.getRazorpay = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const User_1 = __importDefault(require("../models/User"));
const Transaction_1 = __importDefault(require("../models/Transaction"));
const razorpay_1 = __importDefault(require("razorpay"));
const crypto_1 = __importDefault(require("crypto"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const notificationController_1 = require("./notificationController");
const fulfillmentService_1 = require("../services/fulfillmentService");
const utilityController_1 = require("./utilityController");
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
    let userId = req.user?.id || req.user?._id;
    if (!userId) {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            try {
                const token = authHeader.split(' ')[1];
                const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
                if (decoded?.id)
                    userId = decoded.id;
            }
            catch (e) { }
        }
    }
    if (!userId) {
        userId = req.query.userId || req.body.userId;
    }
    const phone = req.query.phone || req.body.phone;
    if (userId && mongoose_1.default.Types.ObjectId.isValid(String(userId))) {
        const user = await User_1.default.findById(userId);
        if (user)
            return user;
    }
    if (phone) {
        const cleanPhone = String(phone).replace(/[^\d]/g, '').slice(-10);
        const user = await User_1.default.findOne({
            $or: [
                { phone: cleanPhone },
                { phone: `+91${cleanPhone}` }
            ]
        });
        if (user)
            return user;
    }
    if (userId && typeof userId === 'string') {
        const cleanPhone = userId.replace(/[^\d]/g, '').slice(-10);
        if (cleanPhone.length === 10) {
            const user = await User_1.default.findOne({
                $or: [
                    { phone: cleanPhone },
                    { phone: `+91${cleanPhone}` }
                ]
            });
            if (user)
                return user;
        }
    }
    return null;
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
/**
 * POST /api/finance/wallet/deduct
 * Atomically deducts funds from user's wallet with session transaction.
 */
const deductMoney = async (req, res) => {
    const { amount, category, referenceId, note } = req.body;
    if (!amount || amount <= 0) {
        return res.status(400).json({ success: false, error: 'Invalid deduction amount' });
    }
    const session = await mongoose_1.default.startSession();
    session.startTransaction();
    try {
        const user = await (0, exports.resolveUser)(req);
        if (!user) {
            await session.abortTransaction();
            return res.status(401).json({ success: false, error: 'User not found or unauthenticated' });
        }
        const liveUser = await User_1.default.findById(user._id).session(session);
        if (!liveUser || liveUser.walletBalance < amount) {
            await session.abortTransaction();
            return res.status(400).json({ success: false, error: 'Insufficient wallet balance' });
        }
        liveUser.walletBalance -= amount;
        await liveUser.save({ session });
        const transaction = await Transaction_1.default.create([{
                user: liveUser._id,
                amount,
                type: 'debit',
                category: category || 'payment',
                referenceId: referenceId || 'Wallet Debit',
                status: 'completed',
                metadata: { note }
            }], { session });
        await session.commitTransaction();
        const io = req.app.get('io');
        if (io) {
            io.to(`user_${liveUser._id}`).emit('wallet_update', {
                amount,
                type: 'debit',
                message: `₹${amount} debited from wallet`,
                newBalance: liveUser.walletBalance
            });
        }
        await (0, notificationController_1.createNotification)(liveUser._id.toString(), 'Payment Successful', `₹${amount} has been deducted from your wallet for ${referenceId || category || 'payment'}.`, 'success');
        res.json({
            success: true,
            message: 'Payment successful',
            balance: liveUser.walletBalance,
            transaction: transaction[0]
        });
    }
    catch (error) {
        await session.abortTransaction();
        console.error('deductMoney Error:', error);
        res.status(500).json({ success: false, error: 'Server error processing deduction' });
    }
    finally {
        session.endSession();
    }
};
exports.deductMoney = deductMoney;
/**
 * POST /api/finance/wallet/add
 * Atomically adds funds to user's wallet with session transaction.
 */
const addMoney = async (req, res) => {
    const { amount, referenceId, note } = req.body;
    if (!amount || amount <= 0) {
        return res.status(400).json({ success: false, error: 'Invalid top-up amount' });
    }
    const session = await mongoose_1.default.startSession();
    session.startTransaction();
    try {
        const user = await (0, exports.resolveUser)(req);
        if (!user) {
            await session.abortTransaction();
            return res.status(401).json({ success: false, error: 'User not found or unauthenticated' });
        }
        const liveUser = await User_1.default.findById(user._id).session(session);
        if (!liveUser) {
            await session.abortTransaction();
            return res.status(404).json({ success: false, error: 'User not found' });
        }
        liveUser.walletBalance += amount;
        await liveUser.save({ session });
        const transaction = await Transaction_1.default.create([{
                user: liveUser._id,
                amount,
                type: 'credit',
                category: 'add_money',
                referenceId: referenceId || 'Wallet Recharge',
                status: 'completed',
                metadata: { note }
            }], { session });
        await session.commitTransaction();
        const io = req.app.get('io');
        if (io) {
            io.to(`user_${liveUser._id}`).emit('wallet_update', {
                amount,
                type: 'credit',
                message: `₹${amount} added to wallet`,
                newBalance: liveUser.walletBalance
            });
        }
        await (0, notificationController_1.createNotification)(liveUser._id.toString(), 'Wallet Recharged', `₹${amount} has been added to your wallet.`, 'success');
        res.json({
            success: true,
            message: 'Money added successfully',
            balance: liveUser.walletBalance,
            transaction: transaction[0]
        });
    }
    catch (error) {
        await session.abortTransaction();
        console.error('addMoney Error:', error);
        res.status(500).json({ success: false, error: 'Server error adding money' });
    }
    finally {
        session.endSession();
    }
};
exports.addMoney = addMoney;
/**
 * POST /api/finance/wallet/transfer
 * Real-time atomic P2P wallet transfer between APEX users via phone number.
 */
const transferMoney = async (req, res) => {
    const { recipientPhone, amount, note } = req.body;
    if (!amount || amount <= 0) {
        return res.status(400).json({ success: false, error: 'Please enter a valid transfer amount' });
    }
    if (!recipientPhone) {
        return res.status(400).json({ success: false, error: 'Recipient phone number is required' });
    }
    const cleanRecipientPhone = String(recipientPhone).replace(/[^\d]/g, '').slice(-10);
    if (cleanRecipientPhone.length !== 10) {
        return res.status(400).json({ success: false, error: 'Please enter a valid 10-digit mobile number' });
    }
    const session = await mongoose_1.default.startSession();
    session.startTransaction();
    try {
        const sender = await (0, exports.resolveUser)(req);
        if (!sender) {
            await session.abortTransaction();
            return res.status(401).json({ success: false, error: 'Authentication required' });
        }
        const liveSender = await User_1.default.findById(sender._id).session(session);
        if (!liveSender) {
            await session.abortTransaction();
            return res.status(404).json({ success: false, error: 'Sender account not found' });
        }
        if (liveSender.walletBalance < amount) {
            await session.abortTransaction();
            return res.status(400).json({ success: false, error: `Insufficient wallet balance (₹${liveSender.walletBalance})` });
        }
        // Lookup recipient
        const recipient = await User_1.default.findOne({
            $or: [
                { phone: cleanRecipientPhone },
                { phone: `+91${cleanRecipientPhone}` }
            ]
        }).session(session);
        if (!recipient) {
            await session.abortTransaction();
            return res.status(404).json({
                success: false,
                error: `User with phone (+91 ${cleanRecipientPhone}) is not registered on APEX.`
            });
        }
        if (recipient._id.toString() === liveSender._id.toString()) {
            await session.abortTransaction();
            return res.status(400).json({ success: false, error: 'Cannot transfer money to your own account' });
        }
        // Atomic debit from sender & credit to recipient
        liveSender.walletBalance -= amount;
        recipient.walletBalance += amount;
        await liveSender.save({ session });
        await recipient.save({ session });
        // Debit transaction for sender
        const senderTx = await Transaction_1.default.create([{
                user: liveSender._id,
                amount,
                type: 'debit',
                category: 'p2p_transfer',
                referenceId: `Sent to ${recipient.name || recipient.phone}`,
                status: 'completed',
                metadata: {
                    recipientId: recipient._id.toString(),
                    recipientName: recipient.name,
                    recipientPhone: recipient.phone,
                    note: note || ''
                }
            }], { session });
        // Credit transaction for recipient
        await Transaction_1.default.create([{
                user: recipient._id,
                amount,
                type: 'credit',
                category: 'p2p_receive',
                referenceId: `Received from ${liveSender.name || liveSender.phone}`,
                status: 'completed',
                metadata: {
                    senderId: liveSender._id.toString(),
                    senderName: liveSender.name,
                    senderPhone: liveSender.phone,
                    note: note || ''
                }
            }], { session });
        await session.commitTransaction();
        const io = req.app.get('io');
        if (io) {
            // Live sync to sender
            io.to(`user_${liveSender._id}`).emit('wallet_update', {
                amount,
                type: 'debit',
                message: `₹${amount} sent to ${recipient.name || cleanRecipientPhone}`,
                newBalance: liveSender.walletBalance
            });
            // Live sync to recipient
            io.to(`user_${recipient._id}`).emit('wallet_update', {
                amount,
                type: 'credit',
                message: `₹${amount} received from ${liveSender.name || liveSender.phone}`,
                newBalance: recipient.walletBalance
            });
        }
        // Push / in-app notifications
        await (0, notificationController_1.createNotification)(liveSender._id.toString(), 'Transfer Successful', `You sent ₹${amount} to ${recipient.name || cleanRecipientPhone}.`, 'success');
        await (0, notificationController_1.createNotification)(recipient._id.toString(), 'Money Received!', `You received ₹${amount} from ${liveSender.name || liveSender.phone}.`, 'success');
        res.json({
            success: true,
            message: `₹${amount} transferred to ${recipient.name || cleanRecipientPhone} successfully`,
            newBalance: liveSender.walletBalance,
            transaction: senderTx[0]
        });
    }
    catch (error) {
        await session.abortTransaction();
        console.error('transferMoney Error:', error);
        res.status(500).json({ success: false, error: 'Server error during transfer' });
    }
    finally {
        session.endSession();
    }
};
exports.transferMoney = transferMoney;
/**
 * POST /api/finance/wallet/pay-merchant
 * Direct QR scan & pay using wallet balance.
 */
const payMerchantWithWallet = async (req, res) => {
    const { amount, payeeVpa, payeeName, note } = req.body;
    if (!amount || amount <= 0) {
        return res.status(400).json({ success: false, error: 'Please enter a valid payment amount' });
    }
    if (!payeeVpa && !payeeName) {
        return res.status(400).json({ success: false, error: 'Merchant details (VPA or Name) are required' });
    }
    const session = await mongoose_1.default.startSession();
    session.startTransaction();
    try {
        const user = await (0, exports.resolveUser)(req);
        if (!user) {
            await session.abortTransaction();
            return res.status(401).json({ success: false, error: 'Authentication required' });
        }
        const liveUser = await User_1.default.findById(user._id).session(session);
        if (!liveUser) {
            await session.abortTransaction();
            return res.status(404).json({ success: false, error: 'User account not found' });
        }
        if (liveUser.walletBalance < amount) {
            await session.abortTransaction();
            return res.status(400).json({
                success: false,
                error: `Insufficient wallet balance (₹${liveUser.walletBalance}). Please top up your wallet or pay via UPI intent.`
            });
        }
        liveUser.walletBalance -= amount;
        await liveUser.save({ session });
        const merchantLabel = payeeName || payeeVpa;
        const transaction = await Transaction_1.default.create([{
                user: liveUser._id,
                amount,
                type: 'debit',
                category: 'qr_payment',
                referenceId: `Paid to ${merchantLabel}`,
                status: 'completed',
                metadata: {
                    payeeVpa: payeeVpa || '',
                    payeeName: payeeName || 'Merchant',
                    note: note || '',
                    paymentMethod: 'APEX_WALLET'
                }
            }], { session });
        await session.commitTransaction();
        const io = req.app.get('io');
        if (io) {
            io.to(`user_${liveUser._id}`).emit('wallet_update', {
                amount,
                type: 'debit',
                message: `₹${amount} paid to ${merchantLabel}`,
                newBalance: liveUser.walletBalance
            });
        }
        await (0, notificationController_1.createNotification)(liveUser._id.toString(), 'Payment Successful', `₹${amount} paid to ${merchantLabel} using APEX Wallet.`, 'success');
        res.json({
            success: true,
            message: 'Payment completed successfully',
            balance: liveUser.walletBalance,
            transaction: transaction[0]
        });
    }
    catch (error) {
        await session.abortTransaction();
        console.error('payMerchantWithWallet Error:', error);
        res.status(500).json({ success: false, error: 'Server error processing QR payment' });
    }
    finally {
        session.endSession();
    }
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
/**
 * GET /api/finance/my-qr
 * Generates user's personal UPI and APEX QR string for receiving money.
 */
const getMyQrPayload = async (req, res) => {
    try {
        const user = await (0, exports.resolveUser)(req);
        if (!user) {
            return res.status(401).json({ success: false, error: 'Authentication required' });
        }
        const cleanPhone = (user.phone || '').replace(/[^\d]/g, '').slice(-10);
        const userName = user.name || 'APEX User';
        // Official standard UPI intent for APEX
        const upiUri = `upi://pay?pa=9494273763@ybl&pn=${encodeURIComponent(userName)}&tr=APEX_${user._id}&cu=INR`;
        const apexUri = `apex://pay?phone=${cleanPhone}&name=${encodeURIComponent(userName)}&id=${user._id}`;
        res.json({
            success: true,
            upiUri,
            apexUri,
            user: {
                _id: user._id,
                name: user.name,
                phone: user.phone
            }
        });
    }
    catch (error) {
        console.error('getMyQrPayload Error:', error);
        res.status(500).json({ success: false, error: 'Server error generating QR code' });
    }
};
exports.getMyQrPayload = getMyQrPayload;
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
        const order = await (0, exports.getRazorpay)().orders.create(options);
        const utilityTransaction = await (0, utilityController_1.createPendingUtilityTransaction)(userId, category, amount, metadata || {}, order.id);
        // Create pending transaction
        await Transaction_1.default.create({
            user: userId,
            amount,
            type: 'credit',
            category: category,
            referenceId: serviceName || 'wallet_topup',
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
                if (isUtilityCategory(transaction.category)) {
                    await scheduleUtilityFulfillment(transaction, req.app.get('io'));
                    return res.json({
                        success: true,
                        message: 'Payment verified. Utility service is processing.',
                        category: transaction.category,
                        utilityTransactionId: transaction.metadata?.utilityTransactionId,
                        status: 'fulfillment_pending'
                    });
                }
                try {
                    const fulfillmentResult = await (0, fulfillmentService_1.fulfillOrder)(transaction, req.app.get('io'));
                    return res.json({
                        success: true,
                        message: "Payment verified and fulfilled successfully",
                        fulfillmentData: fulfillmentResult,
                        category: transaction.category
                    });
                }
                catch (fulfillmentError) {
                    console.error("Fulfillment failed after successful payment:", fulfillmentError);
                    return res.status(500).json({
                        error: 'Payment verified, but failed to deliver service.',
                        details: fulfillmentError.message
                    });
                }
            }
            else {
                // Transaction was already completed (e.g. by webhook) - check if fulfilled
                const existingTx = await Transaction_1.default.findOne({ razorpayOrderId: razorpay_order_id });
                if (existingTx && isUtilityCategory(existingTx.category)) {
                    await scheduleUtilityFulfillment(existingTx, req.app.get('io'));
                    return res.json({
                        success: true,
                        message: 'Payment already verified. Utility service is processing.',
                        category: existingTx.category,
                        utilityTransactionId: existingTx.metadata?.utilityTransactionId,
                        status: existingTx.metadata?.fulfilled ? 'eko_success' : 'fulfillment_pending'
                    });
                }
                if (existingTx && !existingTx.metadata?.fulfilled) {
                    const fulfillmentResult = await (0, fulfillmentService_1.fulfillOrder)(existingTx, req.app.get('io'));
                    return res.json({ success: true, message: "Payment fulfilled successfully", fulfillmentData: fulfillmentResult });
                }
                return res.json({ success: true, message: "Payment already verified and fulfilled" });
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
