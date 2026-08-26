import crypto from 'crypto';
import axios from 'axios';

// Environment Variables
const EKO_DEV_KEY = process.env.EKO_DEV_KEY || '9a40fb2f68f06c86581737e05b58cd3e';
const EKO_ACCESS_KEY = process.env.EKO_ACCESS_KEY || 'd49acab3-ed93-4f44-a366-3ff6746dc58d';
const EKO_INITIATOR_ID = process.env.EKO_INITIATOR_ID || '6303210224';
const EKO_BASE_URL = process.env.EKO_BASE_URL || 'https://api.eko.in:25002/ekoicici/v3';

/**
 * Generates Eko Authentication headers (HMAC-SHA256)
 */
export const getEkoHeaders = (requestHashString?: string) => {
    const timestamp = Date.now().toString();
    
    // Base64-encode the access key, then use that base64 STRING 
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
        const concatenatedString = timestamp + requestHashString;
        const requestHmac = crypto.createHmac('sha256', encodedKey);
        requestHmac.update(concatenatedString);
        headers['request_hash'] = requestHmac.digest('base64');
    }

    return headers;
};

// ─── Discovery & Lookups ───────────────────────────────────────────────

/**
 * BBPS: Fetch Categories (Section 2.1)
 */
export const fetchCategories = async () => {
    const headers = getEkoHeaders();
    const url = `${EKO_BASE_URL}/customer/payment/bbps/categories?initiator_id=${EKO_INITIATOR_ID}`;
    const response = await axios.get(url, { headers });
    return response.data;
};

/**
 * BBPS: Fetch Locations (Section 2.2)
 */
export const fetchLocations = async () => {
    const headers = getEkoHeaders();
    const url = `${EKO_BASE_URL}/customer/payment/bbps/locations?initiator_id=${EKO_INITIATOR_ID}`;
    const response = await axios.get(url, { headers });
    return response.data;
};

/**
 * BBPS: Fetch Operators (Section 2.3)
 */
export const fetchBBPSOperators = async (categoryId?: string, locationId?: string) => {
    const headers = getEkoHeaders();
    let url = `${EKO_BASE_URL}/customer/payment/bbps/operators?initiator_id=${EKO_INITIATOR_ID}`;
    if (categoryId) url += `&category=${categoryId}`;
    if (locationId) url += `&location=${locationId}`;
    const response = await axios.get(url, { headers });
    return response.data;
};

/**
 * BBPS: Fetch Operator Parameters (Section 2.4)
 */
export const fetchOperatorParameters = async (operatorId: string) => {
    const headers = getEkoHeaders();
    const url = `${EKO_BASE_URL}/customer/payment/bbps/operator/${operatorId}/parameters?initiator_id=${EKO_INITIATOR_ID}`;
    const response = await axios.get(url, { headers });
    return response.data;
};

// ─── Recharge Flow ─────────────────────────────────────────────────────

/**
 * Get Operator Code and Circle for a Mobile Number (Recharge flow)
 */
export const getOperatorCodeAndCircle = async (mobile: string) => {
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
};

/**
 * Fetch Mobile Recharge Plans
 */
export const fetchRechargePlans = async (mobile: string, phone_operator_code: string, circleid: string) => {
    const headers = getEkoHeaders();
    const url = `${EKO_BASE_URL}/customer/payment/bbps/recharge/${mobile}/operator/plans?initiator_id=${EKO_INITIATOR_ID}&phone_operator_code=${phone_operator_code}&circleid=${circleid}`;
    const response = await axios.get(url, { headers });
    const resData = response.data;

    if (resData.status !== 0 || !resData.dependent_params) {
        throw new Error(resData.message || 'Failed to fetch plans');
    }

    const reqListObj = resData.dependent_params.find((p: any) => p.name === 'req_list');
    if (!reqListObj || !reqListObj.value) {
        return [];
    }

    const mappedPlans = reqListObj.value.map((plan: any, index: number) => ({
        id: `plan_${plan.amount}_${index}`,
        category: 'All Plans',
        price: parseFloat(plan.amount),
        data: plan.plan_description?.includes('GB') ? extractDataText(plan.plan_description) : 'N/A',
        validity: plan.validity || 'N/A',
        description: plan.plan_description || 'Recharge Plan'
    }));

    return mappedPlans;
};

const extractDataText = (desc: string) => {
    const match = desc.match(/(\d+(\.\d+)?\s?(GB|MB)(\/day)?)/i);
    return match ? match[0] : 'Check Description';
};

// ─── Bill Fetch & Pay ──────────────────────────────────────────────────

/**
 * BBPS: Fetch Bill (Section 5 of PDF)
 * Requires: phone_operator_code, utility_acc_no, + operator-specific params
 * Returns bill data including amount and utilitycustomername
 */
export const fetchBill = async (params: any) => {
    const headers = getEkoHeaders();
    
    const queryParams = new URLSearchParams({
        initiator_id: EKO_INITIATOR_ID,
        ...params
    });

    const url = `${EKO_BASE_URL}/customer/payment/bbps/bill?${queryParams.toString()}`;
    const response = await axios.get(url, { headers });
    return response.data;
};

/**
 * BBPS: Pay Bill / Process Recharge (Section 6 of PDF)
 * POST /customer/payment/bbps
 * 
 * Required fields per PDF:
 * - initiator_id, phone_operator_code, utility_acc_no, confirmation_mobile_no
 * - sender_name, category, amount, utilitycustomername, client_ref_id, source_ip
 */
export const payBBPSBill = async (params: {
    phone_operator_code: string;
    utility_acc_no: string;
    confirmation_mobile_no: string;
    sender_name: string;
    category: number;
    amount: number;
    utilitycustomername: string;
    client_ref_id: string;
    source_ip: string;
    [key: string]: any; // For operator-specific extra params
}) => {
    const USER_CODE = '42290001';
    const requestHashString = `${params.utility_acc_no}${params.amount}${USER_CODE}`;
    const headers = getEkoHeaders(requestHashString);
    const url = `${EKO_BASE_URL}/customer/payment/bbps`;

    const payload = {
        initiator_id: EKO_INITIATOR_ID,
        ...params
    };

    const response = await axios.post(url, payload, { headers });
    return response.data;
};