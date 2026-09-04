"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fulfillOrder = void 0;
const User_1 = __importDefault(require("../models/User"));
const Transaction_1 = __importDefault(require("../models/Transaction"));
const userController_1 = require("../controllers/userController");
const matrimonyController_1 = require("../controllers/matrimonyController");
const travelsController_1 = require("../controllers/travelsController");
const utilityController_1 = require("../controllers/utilityController");
const academyController_1 = require("../controllers/academyController");
const notificationController_1 = require("../controllers/notificationController");
const financeController_1 = require("../controllers/financeController");
/**
 * Centralized, idempotent fulfillment handler for completed payments.
 * Ensures services (Recharge, BBPS, Matrimony, Travel, Academy) are properly delivered,
 * and only 'add_money' category credits the user's APEX wallet balance.
 */
const fulfillOrder = async (transaction, appIo) => {
    if (!transaction)
        return null;
    const metadata = transaction.metadata || {};
    // Idempotency: If already fulfilled, return early
    if (metadata.fulfilled) {
        console.log(`[Fulfillment] Transaction ${transaction._id} (${transaction.razorpayOrderId}) already fulfilled. Skipping.`);
        return metadata.fulfillmentResult || null;
    }
    let fulfillmentResult = null;
    const userIdStr = transaction.user.toString();
    console.log(`[Fulfillment] Processing fulfillment for Order: ${transaction.razorpayOrderId}, Category: ${transaction.category}, Amount: ₹${transaction.amount}`);
    try {
        switch (transaction.category) {
            case 'add_money':
                // ONLY add_money category should credit the user's wallet
                await User_1.default.findByIdAndUpdate(transaction.user, {
                    $inc: { walletBalance: transaction.amount }
                });
                fulfillmentResult = { credited: true, amount: transaction.amount };
                console.log(`[Fulfillment] Credited ₹${transaction.amount} to user wallet.`);
                break;
            case 'mobile_recharge':
                // Execute Eko recharge API
                fulfillmentResult = await (0, utilityController_1.handleUtilityRecharge)(userIdStr, {
                    ...metadata,
                    amount: transaction.amount,
                    razorpayOrderId: transaction.razorpayOrderId,
                    razorpayPaymentId: transaction.razorpayPaymentId,
                    appIo
                });
                break;
            case 'bbps_payment':
                // Execute Eko BBPS payment API
                fulfillmentResult = await (0, utilityController_1.handleBBPSPayment)(userIdStr, {
                    ...metadata,
                    amount: transaction.amount,
                    razorpayOrderId: transaction.razorpayOrderId,
                    razorpayPaymentId: transaction.razorpayPaymentId,
                    appIo
                });
                break;
            case 'matrimony':
                fulfillmentResult = await (0, matrimonyController_1.handleMatrimonyUpgrade)(userIdStr, metadata.plan || transaction.referenceId?.replace('Matrimony ', '').replace(' Plan', ''));
                break;
            case 'subscription':
                fulfillmentResult = await (0, userController_1.handleAPEXPlanUpgrade)(userIdStr, metadata.plan || transaction.referenceId);
                break;
            case 'travel_booking':
                fulfillmentResult = await (0, travelsController_1.handleTravelBooking)(userIdStr, metadata);
                break;
            case 'academy_enrollment':
                fulfillmentResult = await (0, academyController_1.handleAcademyEnrollment)(userIdStr, metadata);
                break;
            case 'charity':
                fulfillmentResult = { status: 'donated' };
                break;
            default:
                console.warn(`[Fulfillment] Unknown category: ${transaction.category}`);
        }
        // Mark transaction metadata as fulfilled
        await Transaction_1.default.findByIdAndUpdate(transaction._id, {
            $set: {
                'metadata.fulfilled': true,
                'metadata.fulfilledAt': new Date(),
                'metadata.fulfillmentResult': fulfillmentResult
            }
        });
        // Send in-app notification to user
        await (0, notificationController_1.createNotification)(userIdStr, 'Payment Successful', `Your payment of ₹${transaction.amount} for ${transaction.referenceId || transaction.category} was successful.`, 'success');
        // Emit live socket event to admin room if io is available
        if (appIo) {
            appIo.to('admin_room').emit('admin_data_refresh', { type: 'new_transaction', data: transaction });
        }
        return fulfillmentResult;
    }
    catch (error) {
        console.error(`[Fulfillment] Error fulfilling transaction ${transaction._id}:`, error);
        let refundInfo = null;
        if (metadata.utilityTransactionId) {
            await (0, utilityController_1.updateUtilityTransactionStatus)(metadata.utilityTransactionId, 'refund_pending', error.message || 'Service delivery failed after payment', {}, appIo);
        }
        // Auto-Refund Mechanism
        if (transaction.razorpayPaymentId) {
            console.log(`[Fulfillment] Auto-refunding payment ${transaction.razorpayPaymentId} due to fulfillment failure.`);
            try {
                const razorpay = (0, financeController_1.getRazorpay)();
                // Amount must be in paise
                const refund = await razorpay.payments.refund(transaction.razorpayPaymentId, {
                    amount: Math.round(transaction.amount * 100),
                    notes: {
                        reason: 'Biller/Service failure',
                        transactionId: transaction._id.toString()
                    }
                });
                refundInfo = {
                    refundId: refund.id,
                    refundedAt: new Date(),
                    status: 'Refunded'
                };
                console.log(`[Fulfillment] Refund successful: ${refund.id}`);
                // Notify user about the refund
                await (0, notificationController_1.createNotification)(userIdStr, 'Payment Refunded', `Your payment of ₹${transaction.amount} has been refunded because the service could not be delivered.`, 'info');
            }
            catch (refundError) {
                console.error(`[Fulfillment] CRITICAL: Auto-refund failed for ${transaction.razorpayPaymentId}:`, refundError);
                refundInfo = {
                    status: 'Refund_Failed',
                    refundError: refundError.message
                };
            }
        }
        await Transaction_1.default.findByIdAndUpdate(transaction._id, {
            $set: {
                status: refundInfo?.status === 'Refunded' ? 'refunded' : 'failed',
                'metadata.fulfillmentError': error.message,
                'metadata.fulfillmentFailedAt': new Date(),
                ...(refundInfo && { 'metadata.refundInfo': refundInfo })
            }
        });
        if (metadata.utilityTransactionId) {
            await (0, utilityController_1.updateUtilityTransactionStatus)(metadata.utilityTransactionId, refundInfo?.status === 'Refunded' ? 'refunded' : 'manual_review', refundInfo?.status === 'Refunded'
                ? 'Payment refunded because service delivery failed'
                : 'Service delivery failed and needs manual review', {
                refundStatus: refundInfo?.status,
                ...(refundInfo && { 'metadata.refundInfo': refundInfo })
            }, appIo);
        }
        throw error;
    }
};
exports.fulfillOrder = fulfillOrder;
