import { Request, Response } from 'express';
import crypto from 'crypto';
import Transaction from '../models/Transaction';
import { fulfillOrder } from '../services/fulfillmentService';
import WebhookEvent from '../models/WebhookEvent';
import { updateUtilityTransactionStatus } from './utilityController';

const isUtilityCategory = (category: string) => ['mobile_recharge', 'bbps_payment'].includes(category);

const scheduleUtilityFulfillment = async (transaction: any, io: any) => {
  const metadata = transaction.metadata || {};
  const queued = await Transaction.findOneAndUpdate(
    { _id: transaction._id, 'metadata.fulfillmentQueued': { $ne: true }, 'metadata.fulfilled': { $ne: true } },
    {
      $set: {
        'metadata.fulfillmentQueued': true,
        'metadata.fulfillmentQueuedAt': new Date()
      }
    },
    { new: true }
  );

  if (!queued) return;

  if (metadata.utilityTransactionId) {
    await updateUtilityTransactionStatus(
      metadata.utilityTransactionId,
      'fulfillment_pending',
      'Payment captured. Utility service is processing.',
      {
        razorpayPaymentId: transaction.razorpayPaymentId,
        razorpayOrderId: transaction.razorpayOrderId
      },
      io
    );
  }

  setImmediate(async () => {
    try {
      await fulfillOrder(queued, io);
    } catch (error) {
      console.error(`[Webhook Utility Fulfillment] Async fulfillment failed for ${queued._id}:`, error);
    }
  });
};

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
  const rawBody = (req as any).rawBody || Buffer.from(JSON.stringify(req.body));
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');

  if (expectedSignature !== signature) {
    console.error('Invalid signature for webhook');
    return res.status(400).send('Invalid signature');
  }

  // Process the event
  const { event, payload } = req.body;
  const eventId = (req.headers['x-razorpay-event-id'] as string) || `${event}:${payload?.payment?.entity?.id || payload?.order?.entity?.id || Date.now()}`;

  try {
    try {
      await WebhookEvent.create({
        provider: 'razorpay',
        eventId,
        event,
        payload: req.body
      });
    } catch (dup: any) {
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
        if (isUtilityCategory(transaction.category)) {
          await scheduleUtilityFulfillment(transaction, req.app.get('io'));
          console.log(`Webhook: Queued utility fulfillment for order ${razorpayOrderId} (${transaction.category})`);
          return res.status(200).send('OK');
        }

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
