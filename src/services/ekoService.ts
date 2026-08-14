import crypto from 'crypto';
import axios from 'axios';

// Environment Variables
const EKO_DEV_KEY = process.env.EKO_DEV_KEY || 'becbbce45f79c6f5109f848acd540567';
const EKO_ACCESS_KEY = process.env.EKO_ACCESS_KEY || 'd2fe1d99-6298-4af2-8cc5-d97dcf46df30';
const EKO_INITIATOR_ID = process.env.EKO_INITIATOR_ID || '6303210224';
const EKO_BASE_URL = 'https://staging.eko.in/ekoapi/v3';

/**
 * Generates Eko Authentication headers
 */
export const getEkoHeaders = () => {
    const timestamp = Date.now().toString();
    
    // The signature is base64(HMAC-SHA256(timestamp, base64(access_key)))
    const accessKeyBuffer = Buffer.from(EKO_ACCESS_KEY, 'base64');
    const hmac = crypto.createHmac('sha256', accessKeyBuffer);
    hmac.update(timestamp);
    const signature = hmac.digest('base64');

    return {
        'developer_key': EKO_DEV_KEY,
        'secret-key-timestamp': timestamp,
        'secret-key': signature,
        'Content-Type': 'application/json'
    };
};

/**
 * Get Operator Code and Circle for a Mobile Number
 */
export const getOperatorCodeAndCircle = async (mobile: string) => {
    try {
        const headers = getEkoHeaders();
        const url = `${EKO_BASE_URL}/customer/payment/bbps/recharge/${mobile}/operator?initiator_id=${EKO_INITIATOR_ID}`;
        
        const response = await axios.get(url, { headers });
        const resData = response.data;
        
        if (resData.status !== 0 || !resData.dependent_params) {
            throw new Error(resData.message || 'Failed to detect operator');
        }

        let phone_operator_code = '';
        let circle_area = '';

        resData.dependent_params.forEach((param: any) => {
            if (param.name === 'phone_operator_code') phone_operator_code = param.value;
            if (param.name === 'circle_area') circle_area = param.value;
        });

        return { phone_operator_code, circleid: circle_area };
    } catch (error: any) {
        console.error('Error in getOperatorCodeAndCircle', error.response?.data || error.message);
        throw error;
    }
};

/**
 * Fetch Mobile Recharge Plans
 */
export const fetchRechargePlans = async (mobile: string, phone_operator_code: string, circleid: string) => {
    try {
        const headers = getEkoHeaders();
        const url = `${EKO_BASE_URL}/customer/payment/bbps/recharge/${mobile}/operator/plans?initiator_id=${EKO_INITIATOR_ID}&phone_operator_code=${phone_operator_code}&circleid=${circleid}`;
        
        const response = await axios.get(url, { headers });
        const resData = response.data;

        if (resData.status !== 0 || !resData.dependent_params) {
            throw new Error(resData.message || 'Failed to fetch plans');
        }

        // Find req_list
        const reqListObj = resData.dependent_params.find((p: any) => p.name === 'req_list');
        if (!reqListObj || !reqListObj.value) {
            return []; // No plans found
        }

        const typeMetadata = reqListObj.type_metadata?.[0]?.headers || [];
        
        // Map Eko's generic response to our UI schema
        const mappedPlans = reqListObj.value.map((plan: any, index: number) => {
            return {
                id: `plan_${plan.amount}_${index}`,
                category: 'All Plans', // Can categorize further if needed
                price: parseFloat(plan.amount),
                data: plan.plan_description?.includes('GB') ? extractDataText(plan.plan_description) : 'N/A',
                validity: plan.validity || 'N/A',
                description: plan.plan_description || 'Recharge Plan'
            };
        });

        return mappedPlans;
    } catch (error: any) {
        console.error('Error fetching plans', error.response?.data || error.message);
        throw error;
    }
};

const extractDataText = (desc: string) => {
    const match = desc.match(/(\d+(\.\d+)?\s?(GB|MB)(\/day)?)/i);
    return match ? match[0] : 'Check Description';
};

/**
 * Process a recharge transaction
 */
export const processRecharge = async (mobile: string, amount: number, operatorCode: string, clientRefId: string) => {
    try {
        const headers = getEkoHeaders();
        const url = `${EKO_BASE_URL}/customer/payment/bbps`;
        
        const payload = {
            initiator_id: EKO_INITIATOR_ID,
            phone_operator_code: operatorCode,
            utility_acc_no: mobile,
            confirmation_mobile_no: mobile,
            sender_name: "Customer", // Eko requirement, can be static for prepaid
            amount: amount,
            client_ref_id: clientRefId,
            source_ip: "127.0.0.1"
        };

        const response = await axios.post(url, payload, { headers });
        const resData = response.data;

        if (resData.status === 0 || resData.response_type_id === 333) {
            return {
                status: 0,
                message: resData.message || 'Transaction Successful',
                txid: resData.data?.tid || clientRefId,
                data: resData.data
            };
        } else {
            return {
                status: 1,
                message: resData.message || 'Transaction Failed',
                error: resData
            };
        }
    } catch (error: any) {
        console.error('Error processing recharge', error.response?.data || error.message);
        throw error;
    }
};

/**
 * Kept for backward compatibility if needed by DTH or other services
 */
export const getUtilityOperators = async () => {
    return [
        { id: 1, name: 'Airtel', category: 'Mobile' },
        { id: 2, name: 'Jio', category: 'Mobile' },
        { id: 3, name: 'VI', category: 'Mobile' },
        { id: 4, name: 'BSNL', category: 'Mobile' },
        { id: 5, name: 'Tata Play', category: 'DTH' },
        { id: 6, name: 'Airtel Digital TV', category: 'DTH' }
    ];
};
