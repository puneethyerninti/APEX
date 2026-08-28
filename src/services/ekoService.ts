import crypto from 'crypto';
import axios from 'axios';

// ─── Eko Configuration (all from env vars — no hardcoded fallbacks) ─────────
const EKO_DEV_KEY = process.env.EKO_DEV_KEY!;
const EKO_ACCESS_KEY = process.env.EKO_ACCESS_KEY!;
const EKO_INITIATOR_ID = process.env.EKO_INITIATOR_ID!;
const EKO_BASE_URL = (process.env.EKO_BASE_URL || 'https://api.eko.in:25002/ekoicici/v3').replace(/\/$/, '');

if (!EKO_DEV_KEY || !EKO_ACCESS_KEY || !EKO_INITIATOR_ID) {
    console.error('CRITICAL: Eko API credentials missing! Set EKO_DEV_KEY, EKO_ACCESS_KEY, EKO_INITIATOR_ID on Render.');
}

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
 * Fetch Mobile Recharge Plans — returns all plan categories, filters out zero-price entries
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

    // Flatten all plans — handles both grouped [{category, list:[]}] and flat array formats
    let allPlans: any[] = [];
    const rawList = reqListObj.value;

    if (Array.isArray(rawList)) {
        if (rawList.length > 0 && rawList[0].list) {
            // Category-grouped format
            rawList.forEach((group: any) => {
                if (Array.isArray(group.list)) {
                    group.list.forEach((plan: any) => {
                        allPlans.push({ ...plan, category_name: group.category || group.plan_name || 'General' });
                    });
                }
            });
        } else {
            // Flat list format
            allPlans = rawList.map((plan: any) => ({ ...plan, category_name: 'All Plans' }));
        }
    }

    const mappedPlans = allPlans
        .filter((plan: any) => parseFloat(plan.amount || plan.price || '0') > 0) // Remove ₹0 plans
        .map((plan: any, index: number) => ({
            id: `plan_${plan.amount || plan.price}_${index}`,
            category: plan.category_name || 'All Plans',
            price: parseFloat(plan.amount || plan.price || '0'),
            data: extractDataText(plan.plan_description || plan.desc || ''),
            validity: plan.validity || plan.plan_validity || 'N/A',
            description: plan.plan_description || plan.desc || 'Recharge Plan'
        }));

    return mappedPlans;
};

const extractDataText = (desc: string) => {
    if (!desc) return 'N/A';
    const match = desc.match(/(\d+(\.\d+)?\s?(GB|MB)(\/day)?)/i);
    return match ? match[0] : 'N/A';
};

// ─── Bill Fetch & Pay ──────────────────────────────────────────────────

/**
 * BBPS: Fetch Bill (Section 5 of Eko PDF)
 * Uses clean query string encoding — source_ip NOT needed for GET fetch.
 */
export const fetchBill = async (params: any) => {
    const headers = getEkoHeaders();

    // Build clean query string — skip empty/null values, don't send source_ip in GET
    const queryParts: string[] = [`initiator_id=${encodeURIComponent(EKO_INITIATOR_ID)}`];
    Object.entries(params).forEach(([key, val]) => {
        if (key === 'source_ip') return; // Not needed for GET bill fetch
        if (val !== undefined && val !== null && val !== '') {
            queryParts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(val))}`);
        }
    });

    const url = `${EKO_BASE_URL}/customer/payment/bbps/bill?${queryParts.join('&')}`;
    console.log('[EKO] fetchBill URL:', url);
    const response = await axios.get(url, { headers });
    console.log('[EKO] fetchBill response:', JSON.stringify(response.data));
    return response.data;
};

/**
 * BBPS: Pay Bill / Process Recharge (Section 6 of Eko PDF)
 * POST endpoint. Requires request_hash for financial transactions.
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