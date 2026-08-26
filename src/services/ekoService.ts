import crypto from 'crypto';
import axios from 'axios';

// Environment Variables
const EKO_DEV_KEY = process.env.EKO_DEV_KEY || '9a40fb2f68f06c86581737e05b58cd3e';
const EKO_ACCESS_KEY = process.env.EKO_ACCESS_KEY || 'd49acab3-ed93-4f44-a366-3ff6746dc58d';
const EKO_INITIATOR_ID = process.env.EKO_INITIATOR_ID || '6303210224';
const EKO_BASE_URL = process.env.EKO_BASE_URL || 'https://api.eko.in:25002/ekoicici';

/**
 * Generates Eko Authentication headers
 */
export const getEkoHeaders = (requestHashString?: string) => {
    const timestamp = Date.now().toString();
    
    // CORRECT: Base64-encode the access key, then use that base64 STRING 
    // directly as the HMAC key (as UTF-8 bytes). Do NOT decode it back.
    const encodedKey = Buffer.from(EKO_ACCESS_KEY).toString('base64');
    
    const hmac = crypto.createHmac('sha256', encodedKey);
    hmac.update(timestamp);
    const signature = hmac.digest('base64');

    const headers: any = {
        'developer_key': EKO_DEV_KEY,
        'secret-key-timestamp': timestamp,
        'secret-key': signature,
        'Accept': 'application/json'
    };

    if (requestHashString) {
        // Concatenate timestamp and the required parameters
        const concatenatedString = timestamp + requestHashString;
        const requestHmac = crypto.createHmac('sha256', encodedKey);
        requestHmac.update(concatenatedString);
        headers['request_hash'] = requestHmac.digest('base64');
    }

    return headers;
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
        const USER_CODE = '42290001'; // Given by Eko Support
        const requestHashString = `${mobile}${amount}${USER_CODE}`;
        const headers = getEkoHeaders(requestHashString);
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
 * BBPS: Fetch Categories
 */
export const fetchCategories = async () => {
    try {
        const headers = getEkoHeaders();
        const url = `${EKO_BASE_URL}/customer/payment/bbps/categories?initiator_id=${EKO_INITIATOR_ID}`;
        const response = await axios.get(url, { headers });
        return response.data;
    } catch (error: any) {
        console.error('Error fetching categories', error.response?.data || error.message);
        throw error;
    }
};

/**
 * BBPS: Fetch Locations
 */
export const fetchLocations = async () => {
    try {
        const headers = getEkoHeaders();
        const url = `${EKO_BASE_URL}/customer/payment/bbps/locations?initiator_id=${EKO_INITIATOR_ID}`;
        const response = await axios.get(url, { headers });
        return response.data;
    } catch (error: any) {
        console.error('Error fetching locations', error.response?.data || error.message);
        throw error;
    }
};

/**
 * BBPS: Fetch Operators
 */
export const fetchBBPSOperators = async (categoryId?: string, locationId?: string) => {
    try {
        const headers = getEkoHeaders();
        let url = `${EKO_BASE_URL}/customer/payment/bbps/operators?initiator_id=${EKO_INITIATOR_ID}`;
        if (categoryId) url += `&category=${categoryId}`;
        if (locationId) url += `&location=${locationId}`;
        const response = await axios.get(url, { headers });
        return response.data;
    } catch (error: any) {
        console.error('Error fetching operators', error.response?.data || error.message);
        throw error;
    }
};

/**
 * BBPS: Fetch Operator Parameters
 */
export const fetchOperatorParameters = async (operatorId: string) => {
    try {
        const headers = getEkoHeaders();
        const url = `${EKO_BASE_URL}/customer/payment/bbps/operator/${operatorId}/parameters?initiator_id=${EKO_INITIATOR_ID}`;
        const response = await axios.get(url, { headers });
        return response.data;
    } catch (error: any) {
        console.error('Error fetching operator parameters', error.response?.data || error.message);
        throw error;
    }
};

/**
 * BBPS: Fetch Bill
 */
export const fetchBill = async (params: any) => {
    try {
        const headers = getEkoHeaders();
        
        // Construct query string dynamically from the input parameters
        const queryParams = new URLSearchParams({
            initiator_id: EKO_INITIATOR_ID,
            ...params
        });

        const url = `${EKO_BASE_URL}/customer/payment/bbps/bill?${queryParams.toString()}`;
        
        const response = await axios.get(url, { headers });
        return response.data;
    } catch (error: any) {
        console.error('Error fetching bill', error.response?.data || error.message);
        throw error;
    }
};

/**
 * Activate a Service for the User
 */
    export const activateService = async (serviceCode: string) => {
        try {
            const headers = getEkoHeaders();
            const USER_CODE = '42290001'; 
            
            // Reverted URL based on latest documentation screenshot
            const url = `${EKO_BASE_URL}/v3/admin/network/agent/${USER_CODE}/service/${serviceCode}/activate`;
            
            const payload = {
                initiator_id: EKO_INITIATOR_ID,
                client_ref_id: 'ACT_' + Date.now()
            };
    
            const response = await axios.put(url, payload, { headers });
            return response.data;
        } catch (error: any) {
            console.error('Error activating service', error.response?.data || error.message);
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