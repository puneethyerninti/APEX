"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.payBill = exports.handleUtilityRecharge = exports.getPlans = exports.getOperators = void 0;
const notificationController_1 = require("./notificationController");
const User_1 = __importDefault(require("../models/User"));
const Transaction_1 = __importDefault(require("../models/Transaction"));
const UtilityTransaction_1 = __importDefault(require("../models/UtilityTransaction"));
const ekoService_1 = require("../services/ekoService");
const crypto_1 = __importDefault(require("crypto"));
const getOperators = async (req, res) => {
    try {
        const operators = await (0, ekoService_1.getUtilityOperators)();
        res.status(200).json({ success: true, data: operators });
    }
    catch (error) {
        console.error('Error in getOperators', error);
        res.status(500).json({ success: false, message: 'Failed to fetch operators' });
    }
};
exports.getOperators = getOperators;
const getPlans = async (req, res) => {
    try {
        const { mobile } = req.query;
        if (!mobile) {
            return res.status(400).json({ success: false, message: 'Mobile number is required' });
        }
        // 1. Get Operator Code and Circle from Eko
        const { phone_operator_code, circleid } = await (0, ekoService_1.getOperatorCodeAndCircle)(mobile);
        // 2. Fetch Plans
        const plans = await (0, ekoService_1.fetchRechargePlans)(mobile, phone_operator_code, circleid);
        res.status(200).json({
            success: true,
            data: plans,
            meta: { phone_operator_code, circleid } // Pass meta back to frontend so it can use it for recharge
        });
    }
    catch (error) {
        console.error('Error in getPlans', error);
        res.status(500).json({ success: false, message: error.message || 'Failed to fetch plans' });
    }
};
exports.getPlans = getPlans;
const handleUtilityRecharge = async (userId, metadata) => {
    const { mobile, amount, operatorCode } = metadata;
    if (!mobile || !amount || !operatorCode || !userId) {
        throw new Error('Missing required fields');
    }
    const clientRefId = `req_${Date.now()}_${crypto_1.default.randomBytes(4).toString('hex')}`.substring(0, 20); // max 20 chars
    // 1. Create Pending Transaction
    const transaction = new UtilityTransaction_1.default({
        userId,
        type: 'Mobile Recharge',
        amount,
        operator: operatorCode,
        mobileOrAccountNumber: mobile,
        status: 'Pending'
    });
    await transaction.save();
    // 2. Call Eko Service
    const ekoResult = await (0, ekoService_1.processRecharge)(mobile, amount, operatorCode, clientRefId);
    // 3. Update Transaction
    if (ekoResult.status === 0) {
        transaction.status = 'Success';
        transaction.ekoTxId = ekoResult.txid;
        await transaction.save();
        // Send Notification
        await (0, notificationController_1.createNotification)(userId, 'Recharge Successful', `Your recharge of ₹${amount} for ${mobile} was successful. (TxID: ${ekoResult.txid})`, 'success');
        return transaction;
    }
    else {
        transaction.status = 'Failed';
        await transaction.save();
        // Refund Safety Net: Credit the exact amount back to the APEX wallet
        const user = await User_1.default.findById(userId);
        if (user) {
            user.walletBalance += amount;
            await user.save();
            // Create a refund transaction
            await Transaction_1.default.create({
                user: userId,
                amount,
                type: 'credit',
                category: 'refund',
                referenceId: transaction._id,
                status: 'completed',
            });
            // Notify User of Refund
            await (0, notificationController_1.createNotification)(userId, 'Recharge Failed - Amount Refunded', `Your recharge of ₹${amount} for ${mobile} failed due to an upstream error. The amount has been safely refunded to your APEX wallet.`, 'info');
        }
        throw new Error(ekoResult.message || 'Recharge failed. Amount refunded to wallet.');
    }
};
exports.handleUtilityRecharge = handleUtilityRecharge;
const payBill = async (req, res) => {
    return res.status(501).json({ error: 'Bill Payments (BBPS) integration is coming soon. Please try again later.' });
};
exports.payBill = payBill;
