import Transaction from '../models/Transaction';
import { getRazorpay } from '../controllers/financeController';
import { fulfillOrder } from './fulfillmentService';

export async function reconcileWalletAndMembershipPayments(io?: any) {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) return;
  const transactions = await Transaction.find({ category: { $in: ['add_money', 'wallet_recharge', 'matrimony'] },
    status: { $in: ['pending', 'completed'] }, 'metadata.fulfilled': { $ne: true },
    'metadata.fulfillmentError': { $exists: false },
    $or: [{ 'metadata.reconcileAfter': { $exists: false } }, { 'metadata.reconcileAfter': { $lte: new Date() } }]
  }).sort({ createdAt: 1 }).limit(10);
  for (const tx of transactions) {
    try {
      await Transaction.updateOne({ _id: tx._id }, { $set: { 'metadata.reconcileAfter': new Date(Date.now() + 15 * 60000) } });
      if (!tx.razorpayOrderId) continue;
      const payments = await getRazorpay().orders.fetchPayments(tx.razorpayOrderId);
      const payment = payments.items?.find((p: any) => p.status === 'captured' && p.order_id === tx.razorpayOrderId && p.currency === 'INR' &&
        Number(p.amount) === Math.round(tx.amount * 100) && Number(p.amount_refunded || 0) === 0 && (!tx.razorpayPaymentId || tx.razorpayPaymentId === p.id));
      if (!payment) continue;
      const captured = await Transaction.findOneAndUpdate({ _id: tx._id, status: { $in: ['pending', 'completed'] }, 'metadata.fulfilled': { $ne: true } },
        { $set: { status: 'completed', razorpayPaymentId: payment.id } }, { new: true });
      if (captured) await fulfillOrder(captured, io);
    } catch (e: any) {
      await Transaction.updateOne({ _id: tx._id }, { $set: { 'metadata.manualReview': true, 'metadata.reviewReason': String(e.message).slice(0,500) } });
    }
  }
}
