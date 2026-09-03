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

/**
 * Maps Eko BBPS category name OR integer to the correct integer category code for the Pay API.
 * Reference: Eko BBPS API documentation — operator_category_id values.
 */
const getCategoryNumber = (categoryNameOrId: string | number): number => {
    if (typeof categoryNameOrId === 'number' && categoryNameOrId > 0) return categoryNameOrId;
    const name = String(categoryNameOrId || '').toLowerCase();
    if (name.includes('broadband')) return 1;
    if (name.includes('lpg') || name.includes('cylinder')) return 18;
    if (name.includes('gas')) return 2;
    if (name.includes('dth') || name.includes('cable tv')) return 4;
    if (name.includes('prepaid')) return 5;
    if (name.includes('credit card')) return 7;
    if (name.includes('electric')) return 8;
    if (name.includes('landline')) return 9;
    if (name.includes('postpaid')) return 10;
    if (name.includes('water')) return 11;
    if (name.includes('housing')) return 12;
    if (name.includes('subscription')) return 13;
    if (name.includes('education')) return 14;
    if (name.includes('municipal tax')) return 15;
    if (name.includes('club') || name.includes('association')) return 16;
    if (name.includes('cable')) return 17;
    if (name.includes('hospital')) return 19;
    if (name.includes('insurance')) return 20;
    if (name.includes('loan') || name.includes('emi')) return 21;
    if (name.includes('fastag')) return 22;
    if (name.includes('municipal serv')) return 23;
    if (name.includes('rental')) return 24;
    if (name.includes('tax')) return 6;
    if (name.includes('challan')) return 27;
    if (name.includes('ev recharge')) return 30;
    return 5; // Default: Mobile Prepaid
};

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
        const paramData = raw?.data?.param_attributes || {};
        res.status(200).json({ success: true, data: paramData });
    } catch (error: any) {
        console.error('Error in getOperatorParams:', error.response?.data || error.message);
        res.status(500).json({ success: false, message: 'Failed to fetch operator parameters' });
    }
};

// ─── Bill Fetch ──────────────────────────────────────────────────────

export const fetchBBPSBill = async (req: Request, res: Response) => {
    try {
        const { phone_operator_code, ...otherParams } = req.body;
        if (!phone_operator_code) {
            return res.status(400).json({ success: false, message: 'phone_operator_code is required' });
        }

        const client_ref_id = `ref_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`.substring(0, 20);

        const raw = await fetchBill({
            phone_operator_code,
            confirmation_mobile_no: '9999999999', // Eko implicitly requires this for some BBPS fetch calls
            ...otherParams
        });

        console.log('[fetchBBPSBill] Eko response:', JSON.stringify(raw));

        if (raw.status === 0 && raw.data) {
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
            // Map Eko error codes to user-friendly messages
            let errorMsg = raw.message || 'Could not fetch bill';
            const data = raw.data || {};
            
            if (errorMsg === 'No key for Response') {
                errorMsg = 'No pending bill found, or invalid account number.';
            } else if (errorMsg === 'Unable to fetch bill' || data.reason?.includes('server is down')) {
                errorMsg = `Biller's server is temporarily unavailable. Please try again later.`;
            } else if (raw.status === 97 && raw.invalid_params) {
                // Eko parameter validation error — pass field-level errors
                const fields = Object.values(raw.invalid_params).join(', ');
                errorMsg = `Invalid input: ${fields}`;
            }
            
            res.status(400).json({ 
                success: false, 
                message: errorMsg,
                ekoStatus: raw.status,
                data: raw.data
            });
        }
    } catch (error: any) {
        console.error('Error in fetchBBPSBill:', error.response?.data || error.message);
        const ekoData = error.response?.data || {};
        let ekoMsg = ekoData.message || error.message;
        if (ekoMsg === 'No key for Response') {
            ekoMsg = 'No pending bill found, or invalid account number.';
        }
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
                category: getCategoryNumber(category || operatorName || ''),
                amount: parseFloat(amount),
                utilitycustomername: utilitycustomername || sender_name || 'Customer',
                client_ref_id: refId,
                source_ip: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || '1.1.1.1',
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
    const { mobile, amount, operatorCode, circleid, planDescription, razorpayOrderId, razorpayPaymentId, operatorName } = metadata;
    
    if (!mobile || !amount || !operatorCode || !userId) {
        throw new Error('Missing required fields');
    }

    const clientRefId = `req_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`.substring(0, 20);

    const transaction = new UtilityTransaction({
        userId,
        type: 'Mobile Recharge',
        amount: parseFloat(amount),
        operator: operatorName || operatorCode,
        mobileOrAccountNumber: mobile,
        clientRefId,
        razorpayOrderId,
        razorpayPaymentId,
        planDescription,
        status: 'Pending',
        metadata: { circleid, operatorCode, operatorName }
    });
    await transaction.save();

    try {
        const ekoResult = await payBBPSBill({
            phone_operator_code: operatorCode,
            utility_acc_no: mobile,
            confirmation_mobile_no: mobile,
            sender_name: 'Customer',
            category: 5, // Mobile Prepaid
            amount: amount,
            utilitycustomername: 'Customer',
            client_ref_id: clientRefId,
            source_ip: '1.1.1.1'
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

/**
 * handleBBPSPayment - Called by financeController after Razorpay payment is verified
 * for BBPS bill payments (Electricity, Water, Gas, Postpaid, DTH, Credit Card, etc.)
 */
export const handleBBPSPayment = async (userId: string, metadata: any) => {
    const {
        operatorCode,
        operatorName,
        utility_acc_no,
        confirmation_mobile_no,
        category,
        utilitycustomername,
        client_ref_id,
        amount,
        razorpayOrderId,
        razorpayPaymentId,
        formValues
    } = metadata;

    if (!operatorCode || !utility_acc_no || !amount) {
        throw new Error('Missing required BBPS payment fields in metadata');
    }

    const refId = client_ref_id || `ref_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`.substring(0, 20);

    const transaction = new UtilityTransaction({
        userId,
        type: 'Bill Payment',
        amount: parseFloat(amount),
        operator: operatorName || operatorCode,
        mobileOrAccountNumber: utility_acc_no,
        clientRefId: refId,
        razorpayOrderId,
        razorpayPaymentId,
        status: 'Pending',
        metadata: { ...formValues, category, utilitycustomername }
    });
    await transaction.save();

    try {
        const ekoResult = await payBBPSBill({
            phone_operator_code: operatorCode.toString(),
            utility_acc_no,
            confirmation_mobile_no: confirmation_mobile_no || utility_acc_no,
            sender_name: 'Customer',
            category: getCategoryNumber(category || operatorName || ''),
            amount: parseFloat(amount),
            utilitycustomername: utilitycustomername || 'Customer',
            client_ref_id: refId,
            source_ip: '1.1.1.1',
            ...(formValues || {})
        });

        if (ekoResult.status === 0 || ekoResult.response_type_id === 333) {
            transaction.status = 'Success';
            transaction.ekoTxId = ekoResult.data?.tid || refId;
            await transaction.save();

            await createNotification(
                userId,
                'Bill Payment Successful',
                `Your bill payment of ₹${amount} for ${operatorName || operatorCode} was successful. TxID: ${transaction.ekoTxId}`,
                'success'
            );

            return transaction;
        } else {
            transaction.status = 'Failed';
            await transaction.save();
            throw new Error(ekoResult.message || 'Bill payment failed at biller end');
        }
    } catch (error: any) {
        console.error('handleBBPSPayment failed:', error.response?.data || error.message);
        transaction.status = 'Failed';
        await transaction.save();
        throw error;
    }
};
