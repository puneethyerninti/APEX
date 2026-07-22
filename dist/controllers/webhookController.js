"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleRazorpayWebhook = void 0;
const crypto_1 = __importDefault(require("crypto"));
const Transaction_1 = __importDefault(require("../models/Transaction"));
const User_1 = __importDefault(require("../models/User"));
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
            const transaction = await Transaction_1.default.findOneAndUpdate({ razorpayOrderId: razorpayOrderId, status: 'pending' }, {
                status: 'completed',
                razorpayPaymentId: razorpayPaymentId,
                referenceId: razorpayPaymentId,
                webhookPayload: req.body
            }, { new: true });
            if (transaction) {
                // Credit the wallet
                await User_1.default.findByIdAndUpdate(transaction.user, {
                    $inc: { walletBalance: transaction.amount }
                });
                console.log(`Webhook: Successfully credited wallet for order ${razorpayOrderId}`);
            }
            else {
                console.log(`Webhook: Transaction for order ${razorpayOrderId} not found or already completed`);
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
