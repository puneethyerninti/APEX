import { Request, Response } from 'express';
import crypto from 'crypto';
import Transaction from '../models/Transaction';
import { fulfillOrder } from '../services/fulfillmentService';

export const handleRazorpayWebhook = async (req: Request, res: Response) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!secret) {
    console.error('Webhook secret missing in env');
    return res.status(500).send('Webhook secret missing');
  }

  const signature = req.headers['x-razorpay-signature'] as string;
  if (!signature) {
    return res.status(400).send('Signature missing');
  }

  // Validate the signature
  const expectedSignature = crypto
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
      let transaction = await Transaction.findOneAndUpdate(
        { razorpayOrderId: razorpayOrderId, status: 'pending' },
        { 
          status: 'completed',
          razorpayPaymentId: razorpayPaymentId,
          referenceId: razorpayPaymentId,
          webhookPayload: req.body
        },
        { new: true }
      );

      if (!transaction) {
        transaction = await Transaction.findOne({ razorpayOrderId: razorpayOrderId });
      }

      if (transaction) {
        // Execute centralized fulfillment for this category
        await fulfillOrder(transaction, req.app.get('io'));
        console.log(`Webhook: Successfully processed fulfillment for order ${razorpayOrderId} (${transaction.category})`);
      } else {
        console.log(`Webhook: Transaction for order ${razorpayOrderId} not found`);
      }
    } else if (event === 'payment.failed') {
      const paymentEntity = payload.payment.entity;
      const razorpayOrderId = paymentEntity.order_id;
      
      await Transaction.findOneAndUpdate(
        { razorpayOrderId: razorpayOrderId, status: 'pending' },
        { 
          status: 'failed',
          webhookPayload: req.body
        }
      );
      console.log(`Webhook: Marked order ${razorpayOrderId} as failed`);
    }

    // Always return 200 OK to acknowledge receipt
    res.status(200).send('OK');
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).send('Server error');
  }
};
