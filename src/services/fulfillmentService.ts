import User from '../models/User';
import Transaction from '../models/Transaction';
import { handleAPEXPlanUpgrade } from '../controllers/userController';
import { handleMatrimonyUpgrade } from '../controllers/matrimonyController';
import { handleTravelBooking } from '../controllers/travelsController';
import { handleUtilityRecharge, handleBBPSPayment } from '../controllers/utilityController';
import { handleAcademyEnrollment } from '../controllers/academyController';
import { createNotification } from '../controllers/notificationController';
import { getRazorpay } from '../controllers/financeController';

/**
 * Centralized, idempotent fulfillment handler for completed payments.
 * Ensures services (Recharge, BBPS, Matrimony, Travel, Academy) are properly delivered,
 * and only 'add_money' category credits the user's APEX wallet balance.
 */
export const fulfillOrder = async (transaction: any, appIo?: any) => {
  if (!transaction) return null;

  const metadata = transaction.metadata || {};

  // Idempotency: If already fulfilled, return early
  if (metadata.fulfilled) {
    console.log(`[Fulfillment] Transaction ${transaction._id} (${transaction.razorpayOrderId}) already fulfilled. Skipping.`);
    return metadata.fulfillmentResult || null;
  }

  let fulfillmentResult: any = null;
  const userIdStr = transaction.user.toString();

  console.log(`[Fulfillment] Processing fulfillment for Order: ${transaction.razorpayOrderId}, Category: ${transaction.category}, Amount: ₹${transaction.amount}`);

  try {
    switch (transaction.category) {
      case 'add_money':
        // ONLY add_money category should credit the user's wallet
        await User.findByIdAndUpdate(transaction.user, { 
          $inc: { walletBalance: transaction.amount } 
        });
        fulfillmentResult = { credited: true, amount: transaction.amount };
        console.log(`[Fulfillment] Credited ₹${transaction.amount} to user wallet.`);
        break;

      case 'mobile_recharge':
        // Execute Eko recharge API
        fulfillmentResult = await handleUtilityRecharge(userIdStr, {
          ...metadata,
          amount: transaction.amount,
          razorpayOrderId: transaction.razorpayOrderId,
          razorpayPaymentId: transaction.razorpayPaymentId
        });
        break;

      case 'bbps_payment':
        // Execute Eko BBPS payment API
        fulfillmentResult = await handleBBPSPayment(userIdStr, {
          ...metadata,
          amount: transaction.amount,
          razorpayOrderId: transaction.razorpayOrderId,
          razorpayPaymentId: transaction.razorpayPaymentId
        });
        break;

      case 'matrimony':
        fulfillmentResult = await handleMatrimonyUpgrade(
          userIdStr, 
          metadata.plan || transaction.referenceId?.replace('Matrimony ', '').replace(' Plan', '')
        );
        break;

      case 'subscription':
        fulfillmentResult = await handleAPEXPlanUpgrade(
          userIdStr, 
          metadata.plan || transaction.referenceId
        );
        break;

      case 'travel_booking':
        fulfillmentResult = await handleTravelBooking(userIdStr, metadata);
        break;

      case 'academy_enrollment':
        fulfillmentResult = await handleAcademyEnrollment(userIdStr, metadata);
        break;

      case 'charity':
        fulfillmentResult = { status: 'donated' };
        break;

      default:
        console.warn(`[Fulfillment] Unknown category: ${transaction.category}`);
    }

    // Mark transaction metadata as fulfilled
    await Transaction.findByIdAndUpdate(transaction._id, {
      $set: {
        'metadata.fulfilled': true,
        'metadata.fulfilledAt': new Date(),
        'metadata.fulfillmentResult': fulfillmentResult
      }
    });

    // Send in-app notification to user
    await createNotification(
      userIdStr,
      'Payment Successful',
      `Your payment of ₹${transaction.amount} for ${transaction.referenceId || transaction.category} was successful.`,
      'success'
    );

    // Emit live socket event to admin room if io is available
    if (appIo) {
      appIo.to('admin_room').emit('admin_data_refresh', { type: 'new_transaction', data: transaction });
    }

    return fulfillmentResult;
  } catch (error: any) {
    console.error(`[Fulfillment] Error fulfilling transaction ${transaction._id}:`, error);
    
    let refundInfo: any = null;

    // Auto-Refund Mechanism
    if (transaction.razorpayPaymentId) {
      console.log(`[Fulfillment] Auto-refunding payment ${transaction.razorpayPaymentId} due to fulfillment failure.`);
      try {
        const razorpay = getRazorpay();
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
        await createNotification(
          userIdStr,
          'Payment Refunded',
          `Your payment of ₹${transaction.amount} has been refunded because the service could not be delivered.`,
          'info'
        );
      } catch (refundError: any) {
        console.error(`[Fulfillment] CRITICAL: Auto-refund failed for ${transaction.razorpayPaymentId}:`, refundError);
        refundInfo = {
          status: 'Refund_Failed',
          refundError: refundError.message
        };
      }
    }

    await Transaction.findByIdAndUpdate(transaction._id, {
      $set: {
        status: refundInfo?.status === 'Refunded' ? 'refunded' : 'failed',
        'metadata.fulfillmentError': error.message,
        'metadata.fulfillmentFailedAt': new Date(),
        ...(refundInfo && { 'metadata.refundInfo': refundInfo })
      }
    });

    throw error;
  }
};