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

export const rechargeMobile = async (req: Request, res: Response) => {
    try {
        const { mobile, amount, operatorCode, userId } = req.body;

        if (!mobile || !amount || !operatorCode || !userId) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
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

            return res.status(200).json({ success: true, message: 'Recharge successful', data: transaction });
        } else {
            transaction.status = 'Failed';
            await transaction.save();
            return res.status(400).json({ success: false, message: 'Recharge failed', error: ekoResult.message });
        }

    } catch (error) {
        console.error('Error in rechargeMobile', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

export const payBill = async (req: Request, res: Response) => {
  const { userId, billerName, amount } = req.body;

  if (!userId || !billerName) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const numericAmount = parseInt(amount.toString().replace(/[^0-9]/g, ''), 10) || 500;

    // Record the mock transaction
    await Transaction.create({
      user: userId,
      amount: numericAmount,
      type: 'debit',
      category: 'utility_payment',
      status: 'completed',
      referenceId: `bill_${Date.now()}`
    } as any);

    // Send Real-Time Notification
    await createNotification(
      userId,
      'Bill Payment Successful',
      `Your payment of ₹${numericAmount} for ${billerName} was successful.`,
      'success'
    );

    res.json({ success: true, message: 'Bill paid successfully' });
  } catch (error) {
    console.error('Error paying bill:', error);
    res.status(500).json({ error: 'Server error' });
  }
};
