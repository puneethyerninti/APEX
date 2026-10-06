"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.reconcileWalletAndMembershipPayments = reconcileWalletAndMembershipPayments;
const Transaction_1 = __importDefault(require("../models/Transaction"));
const financeController_1 = require("../controllers/financeController");
const fulfillmentService_1 = require("./fulfillmentService");
async function reconcileWalletAndMembershipPayments(io) {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET)
        return;
    const transactions = await Transaction_1.default.find({ category: { $in: ['add_money', 'wallet_recharge', 'matrimony'] },
        status: { $in: ['pending', 'completed'] }, 'metadata.fulfilled': { $ne: true },
        'metadata.fulfillmentError': { $exists: false },
        $or: [{ 'metadata.reconcileAfter': { $exists: false } }, { 'metadata.reconcileAfter': { $lte: new Date() } }]
    }).sort({ createdAt: 1 }).limit(10);
    for (const tx of transactions) {
        try {
            await Transaction_1.default.updateOne({ _id: tx._id }, { $set: { 'metadata.reconcileAfter': new Date(Date.now() + 15 * 60000) } });
            if (!tx.razorpayOrderId)
                continue;
            const payments = await (0, financeController_1.getRazorpay)().orders.fetchPayments(tx.razorpayOrderId);
            const payment = payments.items?.find((p) => p.status === 'captured' && p.order_id === tx.razorpayOrderId && p.currency === 'INR' &&
                Number(p.amount) === Math.round(tx.amount * 100) && Number(p.amount_refunded || 0) === 0 && (!tx.razorpayPaymentId || tx.razorpayPaymentId === p.id));
            if (!payment)
                continue;
            const captured = await Transaction_1.default.findOneAndUpdate({ _id: tx._id, status: { $in: ['pending', 'completed'] }, 'metadata.fulfilled': { $ne: true } }, { $set: { status: 'completed', razorpayPaymentId: payment.id } }, { new: true });
            if (captured)
                await (0, fulfillmentService_1.fulfillOrder)(captured, io);
        }
        catch (e) {
            await Transaction_1.default.updateOne({ _id: tx._id }, { $set: { 'metadata.manualReview': true, 'metadata.reviewReason': String(e.message).slice(0, 500) } });
        }
    }
}
