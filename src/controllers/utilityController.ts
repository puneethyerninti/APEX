import { Request, Response } from 'express';
import { createNotification } from './notificationController';
import User from '../models/User';
import Transaction from '../models/Transaction';
import UtilityTransaction from '../models/UtilityTransaction';
import { 
  getUtilityOperators, 
  processRecharge, 
  fetchRechargePlans, 
  getOperatorCodeAndCircle,
  fetchCategories,
  fetchLocations,
  fetchBBPSOperators,
  fetchOperatorParameters,
  fetchBill,
  activateService
} from '../services/ekoService';
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

export const getCategories = async (req: Request, res: Response) => {
    try {
        const categories = await fetchCategories();
        res.status(200).json({ success: true, data: categories });
    } catch (error: any) {
        console.error('API Error in getCategories:', error.message);
        res.status(500).json({ success: false, message: 'Failed to fetch categories' });
    }
};

export const getLocations = async (req: Request, res: Response) => {
    try {
        const locations = await fetchLocations();
        res.status(200).json({ success: true, data: locations });
    } catch (error: any) {
        console.error('API Error in getLocations:', error.message);
        res.status(500).json({ success: false, message: 'Failed to fetch locations' });
    }
};

export const getBBPSOperatorsList = async (req: Request, res: Response) => {
    try {
        const { category, location } = req.query;
        const operators = await fetchBBPSOperators(category as string, location as string);
        res.status(200).json({ success: true, data: operators });
    } catch (error: any) {
        console.error('API Error in getBBPSOperatorsList:', error.message);
        res.status(500).json({ success: false, message: 'Failed to fetch operators' });
    }
};

export const getOperatorParams = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        if (!id) return res.status(400).json({ success: false, message: 'Operator ID is required' });
        
        const params = await fetchOperatorParameters(id as string);
        res.status(200).json({ success: true, data: params });
    } catch (error: any) {
        console.error('API Error in getOperatorParams:', error.message);
        res.status(500).json({ success: false, message: 'Failed to fetch operator parameters' });
    }
};

export const fetchBBPSBill = async (req: Request, res: Response) => {
    try {
        // req.body will contain the dynamic parameters needed by the operator
        const bill = await fetchBill(req.body);
        res.status(200).json({ success: true, data: bill });
    } catch (error: any) {
        console.error('API Error in fetchBBPSBill:', error.message);
        res.status(500).json({ success: false, message: 'Failed to fetch BBPS bill' });
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
        console.error('API Error in getPlans:', error.message);
        res.status(500).json({ success: false, message: 'Failed to fetch recharge plans' });
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

  try {
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
          throw new Error(ekoResult.message || 'Recharge failed.');
      }
  } catch (error: any) {
      console.error('Recharge failed:', error.message);
      transaction.status = 'Failed';
      await transaction.save();
      throw error;
  }
};

export const payBill = async (req: Request, res: Response) => {
  try {
      const { userId, operatorCode, amount, utility_acc_no, ...otherParams } = req.body;
      
      if (!userId || !operatorCode || !amount || !utility_acc_no) {
          return res.status(400).json({ success: false, message: 'Missing required fields' });
      }

      // We call processRecharge, which maps to Eko BBPS POST endpoint
      // We pass utility_acc_no as the primary account/mobile field
      const clientRefId = `req_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`.substring(0, 20);
      
      const transaction = new UtilityTransaction({
          userId,
          type: 'Bill Payment',
          amount,
          operator: operatorCode,
          mobileOrAccountNumber: utility_acc_no,
          status: 'Pending'
      });
      await transaction.save();

      try {
          const ekoResult = await processRecharge(utility_acc_no, amount, operatorCode, clientRefId);

          if (ekoResult.status === 0) {
              transaction.status = 'Success';
              transaction.ekoTxId = ekoResult.txid;
              await transaction.save();
              
              await createNotification(
                userId,
                'Bill Payment Successful',
                `Your bill payment of ₹${amount} was successful. (TxID: ${ekoResult.txid})`,
                'success'
              );

              return res.status(200).json({ success: true, data: transaction });
          } else {
             throw new Error(ekoResult.message || 'Payment failed');
          }
      } catch (error: any) {
          console.error('Bill payment failed:', error.message);
          transaction.status = 'Failed';
          await transaction.save();
          return res.status(500).json({ success: false, message: 'Payment failed' });
      }
  } catch (error: any) {
      console.error('Error in payBill', error);
      res.status(500).json({ success: false, message: error.message || 'Payment failed' });
  }
};

export const activateServiceEndpoint = async (req: Request, res: Response) => {
    try {
        const { serviceCode } = req.body;
        if (!serviceCode) {
            return res.status(400).json({ success: false, message: 'Service code is required' });
        }
        
        const response = await activateService(serviceCode);
        res.status(200).json({ success: true, data: response });
    } catch (error: any) {
        console.error('Error activating service', error);
        res.status(500).json({ success: false, message: error.message || 'Failed to activate service' });
    }
};
