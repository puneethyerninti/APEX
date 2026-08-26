import { Request, Response } from 'express';
import { createNotification } from './notificationController';
import UtilityTransaction from '../models/UtilityTransaction';
import { 
  fetchCategories,
  fetchLocations,
  fetchBBPSOperators,
  fetchOperatorParameters,
  fetchBill,
  payBBPSBill,
  fetchRechargePlans, 
  getOperatorCodeAndCircle,
} from '../services/ekoService';
import crypto from 'crypto';

// ─── Discovery Endpoints ───────────────────────────────────────────────

export const getCategories = async (req: Request, res: Response) => {
    try {
        const raw = await fetchCategories();
        // Normalize: extract the list_elements array for the frontend
        const categories = raw?.param_attributes?.list_elements || [];
        res.status(200).json({ success: true, data: categories });
    } catch (error: any) {
        console.error('Error in getCategories:', error.response?.data || error.message);
        res.status(500).json({ success: false, message: 'Failed to fetch categories' });
    }
};

export const getLocations = async (req: Request, res: Response) => {
    try {
        const raw = await fetchLocations();
        const locations = raw?.param_attributes?.list_elements || [];
        res.status(200).json({ success: true, data: locations });
    } catch (error: any) {
        console.error('Error in getLocations:', error.response?.data || error.message);
        res.status(500).json({ success: false, message: 'Failed to fetch locations' });
    }
};

export const getBBPSOperatorsList = async (req: Request, res: Response) => {
    try {
        const { category, location } = req.query;
        const raw = await fetchBBPSOperators(category as string, location as string);
        const operators = raw?.param_attributes?.list_elements || [];
        res.status(200).json({ success: true, data: operators });
    } catch (error: any) {
        console.error('Error in getBBPSOperatorsList:', error.response?.data || error.message);
        res.status(500).json({ success: false, message: 'Failed to fetch operators' });
    }
};

export const getOperatorParams = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        if (!id) return res.status(400).json({ success: false, message: 'Operator ID is required' });
        
        const raw = await fetchOperatorParameters(id as string);
        // Return the full param_attributes so frontend can use list_elements + fetchBill flag
        const paramData = raw?.param_attributes || {};
        res.status(200).json({ success: true, data: paramData });
    } catch (error: any) {
        console.error('Error in getOperatorParams:', error.response?.data || error.message);
        res.status(500).json({ success: false, message: 'Failed to fetch operator parameters' });
    }
};

// ─── Bill Fetch ────────────────────────────────────────────────────────

export const fetchBBPSBill = async (req: Request, res: Response) => {
    try {
        const { phone_operator_code, ...otherParams } = req.body;
        if (!phone_operator_code) {
            return res.status(400).json({ success: false, message: 'phone_operator_code is required' });
        }

        // Generate a unique client_ref_id that will be reused in Pay Bill
        const client_ref_id = `ref_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`.substring(0, 20);

        const raw = await fetchBill({
            phone_operator_code,
            client_ref_id,
            ...otherParams
        });

        if (raw.status === 0 && raw.data) {
            // Return bill data + the client_ref_id for reuse in Pay Bill
            res.status(200).json({ 
                success: true, 
                data: {
                    amount: raw.data.amount,
                    utilitycustomername: raw.data.utilitycustomername || '',
                    billDueDate: raw.data.billDueDate || '',
                    customer_id: raw.data.customer_id || '',
                    bbpstrxnrefid: raw.data.bbpstrxnrefid || '',
                    client_ref_id
                }
            });
        } else {
            res.status(400).json({ 
                success: false, 
                message: raw.message || 'Could not fetch bill',
                data: raw.data
            });
        }
    } catch (error: any) {
        console.error('Error in fetchBBPSBill:', error.response?.data || error.message);
        const ekoMsg = error.response?.data?.message || error.message;
        res.status(500).json({ success: false, message: ekoMsg || 'Failed to fetch bill' });
    }
};

// ─── Pay Bill ──────────────────────────────────────────────────────────

export const payBill = async (req: Request, res: Response) => {
    try {
        const { 
            userId, 
            operatorCode, 
            operatorName,
            amount, 
            utility_acc_no, 
            confirmation_mobile_no,
            sender_name,
            category,
            utilitycustomername,
            client_ref_id,
            ...extraParams 
        } = req.body;
      
        if (!userId || !operatorCode || !amount || !utility_acc_no) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        // Generate client_ref_id if not provided (e.g., direct recharge without fetch-bill)
        const refId = client_ref_id || `ref_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`.substring(0, 20);

        // 1. Create Pending Transaction in DB
        const transaction = new UtilityTransaction({
            userId,
            type: category ? 'Bill Payment' : 'Mobile Recharge',
            amount: parseFloat(amount),
            operator: operatorName || operatorCode,
            mobileOrAccountNumber: utility_acc_no,
            status: 'Pending'
        });
        await transaction.save();

        try {
            // 2. Call Eko Pay Bill API (Section 6 of PDF)
            const ekoResult = await payBBPSBill({
                phone_operator_code: operatorCode.toString(),
                utility_acc_no,
                confirmation_mobile_no: confirmation_mobile_no || utility_acc_no,
                sender_name: sender_name || 'Customer',
                category: category || 0,
                amount: parseFloat(amount),
                utilitycustomername: utilitycustomername || sender_name || 'Customer',
                client_ref_id: refId,
                source_ip: req.ip || '127.0.0.1',
                ...extraParams
            });

            // 3. Check result
            if (ekoResult.status === 0 || ekoResult.response_type_id === 333) {
                transaction.status = 'Success';
                transaction.ekoTxId = ekoResult.data?.tid || refId;
                await transaction.save();
                
                await createNotification(
                    userId,
                    'Payment Successful',
                    `Your payment of ₹${amount} for ${operatorName || operatorCode} was successful. (TxID: ${transaction.ekoTxId})`,
                    'success'
                );

                return res.status(200).json({ 
                    success: true, 
                    data: {
                        transaction,
                        ekoData: ekoResult.data
                    }
                });
            } else {
                transaction.status = 'Failed';
                await transaction.save();
                return res.status(400).json({ 
                    success: false, 
                    message: ekoResult.message || 'Payment failed at biller end',
                    data: ekoResult
                });
            }
        } catch (error: any) {
            console.error('Eko Pay Bill failed:', error.response?.data || error.message);
            transaction.status = 'Failed';
            await transaction.save();
            
            await createNotification(
                userId,
                'Payment Failed',
                `Your payment of ₹${amount} for ${operatorName || operatorCode} failed. Please try again.`,
                'error'
            );

            return res.status(500).json({ 
                success: false, 
                message: error.response?.data?.message || 'Payment failed' 
            });
        }
    } catch (error: any) {
        console.error('Error in payBill:', error);
        res.status(500).json({ success: false, message: error.message || 'Payment failed' });
    }
};

// ─── Recharge Flow (Mobile Prepaid / DTH) ──────────────────────────────

export const getPlans = async (req: Request, res: Response) => {
    try {
        const { mobile } = req.query;
        if (!mobile) {
            return res.status(400).json({ success: false, message: 'Mobile number is required' });
        }
        
        const { phone_operator_code, circleid } = await getOperatorCodeAndCircle(mobile as string);
        const plans = await fetchRechargePlans(mobile as string, phone_operator_code, circleid);
        
        res.status(200).json({ 
            success: true, 
            data: plans,
            meta: { phone_operator_code, circleid }
        });
    } catch (error: any) {
        console.error('Error in getPlans:', error.response?.data || error.message);
        res.status(500).json({ success: false, message: 'Failed to fetch recharge plans' });
    }
};

/**
 * Handle recharge triggered after Razorpay payment verification
 */
export const handleUtilityRecharge = async (userId: string, metadata: any) => {
    const { mobile, amount, operatorCode } = metadata;
    
    if (!mobile || !amount || !operatorCode || !userId) {
        throw new Error('Missing required fields');
    }

    const clientRefId = `req_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`.substring(0, 20);

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
        const ekoResult = await payBBPSBill({
            phone_operator_code: operatorCode,
            utility_acc_no: mobile,
            confirmation_mobile_no: mobile,
            sender_name: 'Customer',
            category: 5, // Mobile Prepaid category
            amount: amount,
            utilitycustomername: 'Customer',
            client_ref_id: clientRefId,
            source_ip: '127.0.0.1'
        });

        if (ekoResult.status === 0 || ekoResult.response_type_id === 333) {
            transaction.status = 'Success';
            transaction.ekoTxId = ekoResult.data?.tid || clientRefId;
            await transaction.save();
            
            await createNotification(
                userId,
                'Recharge Successful',
                `Your recharge of ₹${amount} for ${mobile} was successful. (TxID: ${transaction.ekoTxId})`,
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
