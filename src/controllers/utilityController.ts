import { Request, Response } from 'express';
import { createNotification } from './notificationController';
import User from '../models/User';
import Transaction from '../models/Transaction';
import UtilityTransaction from '../models/UtilityTransaction';
import { getUtilityOperators, processRecharge, fetchRechargePlans, getOperatorCodeAndCircle } from '../services/ekoService';
import crypto from 'crypto';

export const getOperators = async (req: Request, res: Response) => {
    try {
        const operators = await getUtilityOperators();
        res.status(200).json({ success: true, data: operators });
    } catch (error) {
        console.error('Error in getOperators', error);
        res.status(500).json({ success: false, message: 'Failed to fetch operators' });
    }
};

export const getPlans = async (req: Request, res: Response) => {
    try {
        const { mobile } = req.query;
        if (!mobile) {
            return res.status(400).json({ success: false, message: 'Mobile number is required' });
        }
        
        // 1. Get Operator Code and Circle from Eko
        const { phone_operator_code, circleid } = await getOperatorCodeAndCircle(mobile as string);

        // 2. Fetch Plans
        const plans = await fetchRechargePlans(mobile as string, phone_operator_code, circleid);
        
        res.status(200).json({ 
            success: true, 
            data: plans,
            meta: { phone_operator_code, circleid } // Pass meta back to frontend so it can use it for recharge
        });
    } catch (error: any) {
        console.error('Error in getPlans', error);
        res.status(500).json({ success: false, message: error.message || 'Failed to fetch plans' });
    }
};

export const handleUtilityRecharge = async (userId: string, metadata: any) => {
  const { mobile, amount, operatorCode } = metadata;
  
  if (!mobile || !amount || !operatorCode || !userId) {
      throw new Error('Missing required fields');
  }

  const clientRefId = `req_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`.substring(0, 20); // max 20 chars

  // 1. Create Pending Transaction
  const transaction = new UtilityTransaction({
      userId,
      type: 'Mobile Recharge',
      amount,
      operator: operatorCode,
      mobileOrAccountNumber: mobile,
      status: 'Pending'
  });
  await transaction.save();

  // 2. Call Eko Service
  const ekoResult = await processRecharge(mobile, amount, operatorCode, clientRefId);

  // 3. Update Transaction
  if (ekoResult.status === 0) {
      transaction.status = 'Success';
      transaction.ekoTxId = ekoResult.txid;
      await transaction.save();
      
      // Send Notification
      await createNotification(
        userId,
        'Recharge Successful',
        `Your recharge of ₹${amount} for ${mobile} was successful. (TxID: ${ekoResult.txid})`,
        'success'
      );

      return transaction;
  } else {
      transaction.status = 'Failed';
      await transaction.save();

      // Refund Safety Net: Credit the exact amount back to the APEX wallet
      const user = await User.findById(userId);
      if (user) {
          user.walletBalance += amount;
          await user.save();

          // Create a refund transaction
          await Transaction.create({
              user: userId,
              amount,
              type: 'credit',
              category: 'refund',
              referenceId: transaction._id,
              status: 'completed',
          } as any);

          // Notify User of Refund
          await createNotification(
              userId,
              'Recharge Failed - Amount Refunded',
              `Your recharge of ₹${amount} for ${mobile} failed due to an upstream error. The amount has been safely refunded to your APEX wallet.`,
              'info'
          );
      }

      throw new Error(ekoResult.message || 'Recharge failed. Amount refunded to wallet.');
  }
};

export const payBill = async (req: Request, res: Response) => {
  return res.status(501).json({ error: 'Bill Payments (BBPS) integration is coming soon. Please try again later.' });
};
