"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleRazorpayWebhook = void 0;
const crypto_1 = __importDefault(require("crypto"));
const Transaction_1 = __importDefault(require("../models/Transaction"));
const fulfillmentService_1 = require("../services/fulfillmentService");
const WebhookEvent_1 = __importDefault(require("../models/WebhookEvent"));
const utilityController_1 = require("./utilityController");
const isUtilityCategory = (category) => ['mobile_recharge', 'bbps_payment'].includes(category);
const scheduleUtilityFulfillment = async (transaction, io) => {
    const metadata = transaction.metadata || {};
    const queued = await Transaction_1.default.findOneAndUpdate({ _id: transaction._id, 'metadata.fulfillmentQueued': { $ne: true }, 'metadata.fulfilled': { $ne: true } }, {
        $set: {
            'metadata.fulfillmentQueued': true,
            'metadata.fulfillmentQueuedAt': new Date()
        }
    }, { new: true });
    if (!queued)
        return;
    if (metadata.utilityTransactionId) {
        await (0, utilityController_1.updateUtilityTransactionStatus)(metadata.utilityTransactionId, 'fulfillment_pending', 'Payment captured. Utility service is processing.', {
            razorpayPaymentId: transaction.razorpayPaymentId,
            razorpayOrderId: transaction.razorpayOrderId
        }, io);
    }
    setImmediate(async () => {
        try {
            await (0, fulfillmentService_1.fulfillOrder)(queued, io);
        }
        catch (error) {
            console.error(`[Webhook Utility Fulfillment] Async fulfillment failed for ${queued._id}:`, error);
        }
    });
};
const handleRazorpayWebhook = async (req, res) => {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret) {
        console.error('Webhook secret missing in env');
        return res.status(500).send('Webhook secret missing');
    }
    const signature = req.headers['x-razorpay-signature'];
    if (!signature) {
        return res.status(400).send('Signature missing');
    }
    // Validate the signature
    const rawBody = req.rawBody || Buffer.from(JSON.stringify(req.body));
    const expectedSignature = crypto_1.default
        .createHmac('sha256', secret)
        .update(rawBody)
        .digest('hex');
    if (expectedSignature !== signature) {
        console.error('Invalid signature for webhook');
        return res.status(400).send('Invalid signature');
    }
    // Process the event
    const { event, payload } = req.body;
    const eventId = req.headers['x-razorpay-event-id'] || `${event}:${payload?.payment?.entity?.id || payload?.order?.entity?.id || Date.now()}`;
    try {
        try {
            await WebhookEvent_1.default.create({
                provider: 'razorpay',
                eventId,
                event,
                payload: req.body
            });
        }
        catch (dup) {
            if (dup?.code === 11000) {
                return res.status(200).send('Duplicate webhook ignored');
            }
            throw dup;
        }
        if (event === 'payment.captured') {
            const paymentEntity = payload.payment.entity;
            const razorpayOrderId = paymentEntity.order_id;
            const razorpayPaymentId = paymentEntity.id;
            // Idempotency check: Find pending transaction and complete it
            let transaction = await Transaction_1.default.findOneAndUpdate({ razorpayOrderId: razorpayOrderId, status: 'pending' }, {
                status: 'completed',
                razorpayPaymentId: razorpayPaymentId,
                referenceId: razorpayPaymentId,
                webhookPayload: req.body
            }, { new: true });
            if (!transaction) {
                transaction = await Transaction_1.default.findOne({ razorpayOrderId: razorpayOrderId });
            }
            if (transaction) {
                if (isUtilityCategory(transaction.category)) {
                    await scheduleUtilityFulfillment(transaction, req.app.get('io'));
                    console.log(`Webhook: Queued utility fulfillment for order ${razorpayOrderId} (${transaction.category})`);
                    return res.status(200).send('OK');
                }
                // Execute centralized fulfillment for this category
                await (0, fulfillmentService_1.fulfillOrder)(transaction, req.app.get('io'));
                console.log(`Webhook: Successfully processed fulfillment for order ${razorpayOrderId} (${transaction.category})`);
            }
            else {
                console.log(`Webhook: Transaction for order ${razorpayOrderId} not found`);
            }
        }
        else if (event === 'payment.failed') {
            const paymentEntity = payload.payment.entity;
            const razorpayOrderId = paymentEntity.order_id;
            await Transaction_1.default.findOneAndUpdate({ razorpayOrderId: razorpayOrderId, status: 'pending' }, {
                status: 'failed',
                webhookPayload: req.body
            });
            console.log(`Webhook: Marked order ${razorpayOrderId} as failed`);
        }
        // Always return 200 OK to acknowledge receipt
        res.status(200).send('OK');
    }
    catch (error) {
        console.error('Error processing webhook:', error);
        res.status(500).send('Server error');
    }
};
exports.handleRazorpayWebhook = handleRazorpayWebhook;
