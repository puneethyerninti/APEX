"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleRazorpayWebhook = void 0;
const crypto_1 = __importDefault(require("crypto"));
const Transaction_1 = __importDefault(require("../models/Transaction"));
const fulfillmentService_1 = require("../services/fulfillmentService");
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
    const expectedSignature = crypto_1.default
        .createHmac('sha256', secret)
        .update(JSON.stringify(req.body))
        .digest('hex');
    if (expectedSignature !== signature) {
        console.error('Invalid signature for webhook');
        return res.status(400).send('Invalid signature');
    }
    // Process the event
    const { event, payload } = req.body;
    try {
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
