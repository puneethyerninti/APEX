import crypto from 'crypto';
import axios from 'axios';
import EkoCache from '../models/EkoCache';

// ─── Eko Configuration (Dynamic getters to support dotenv loading late) ─────────
const getEkoConfig = () => {
    const EKO_DEV_KEY = process.env.EKO_DEV_KEY;
    const EKO_ACCESS_KEY = process.env.EKO_ACCESS_KEY;
    const EKO_INITIATOR_ID = process.env.EKO_INITIATOR_ID;
    const EKO_BASE_URL = (process.env.EKO_BASE_URL || 'https://api.eko.in:25002/ekoicici/v1').replace(/\/$/, '');
    const EKO_USER_CODE = process.env.EKO_USER_CODE || EKO_INITIATOR_ID;
    const EKO_LATLONG = process.env.EKO_LATLONG || '';
    
    if (!EKO_DEV_KEY || !EKO_ACCESS_KEY || !EKO_INITIATOR_ID || !EKO_USER_CODE || !EKO_LATLONG) {
        console.error('CRITICAL: Eko API config missing! Set EKO_DEV_KEY, EKO_ACCESS_KEY, EKO_INITIATOR_ID, EKO_USER_CODE, and EKO_LATLONG on Render.');
    }
    
    return { EKO_DEV_KEY, EKO_ACCESS_KEY: EKO_ACCESS_KEY || '', EKO_INITIATOR_ID, EKO_BASE_URL, EKO_USER_CODE, EKO_LATLONG };
};

const requireEkoConfig = () => {
    const config = getEkoConfig();
    if (!config.EKO_DEV_KEY || !config.EKO_ACCESS_KEY || !config.EKO_INITIATOR_ID || !config.EKO_USER_CODE) {
        throw new Error('Eko API credentials are not configured');
    }
    return config;
};

const cacheGet = async (key: string) => {
    const cached = await EkoCache.findOne({ key, expiresAt: { $gt: new Date() } }).lean();
    return cached?.data || null;
};

const cacheSet = async (key: string, data: any, ttlMs = 12 * 60 * 60 * 1000) => {
    await EkoCache.findOneAndUpdate(
        { key },
        { key, data, expiresAt: new Date(Date.now() + ttlMs) },
        { upsert: true, new: true }
    );
};

const withCache = async (key: string, producer: () => Promise<any>, ttlMs?: number) => {
    const cached = await cacheGet(key);
    if (cached) return cached;

    const data = await producer();
    await cacheSet(key, data, ttlMs);
    return data;
};

const buildQuery = (params: Record<string, any>) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            query.append(key, String(value));
        }
    });
    return query.toString();
};

const getBbpsReadBaseUrl = (baseUrl: string) => baseUrl.replace(/\/v\d+$/i, '/v1');

export const getClientIp = (req: any) => {
    return (req.headers?.['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || req.socket?.remoteAddress || '127.0.0.1';
};

/**
 * Generates Eko Authentication headers (HMAC-SHA256)
 */
export const getEkoHeaders = (requestHashString?: string) => {
    const { EKO_DEV_KEY, EKO_ACCESS_KEY } = getEkoConfig();
    // Eko requires the plain text key to be base64 encoded BEFORE being used for HMAC
    const encodedKey = Buffer.from(EKO_ACCESS_KEY).toString('base64');
    const timestamp = Date.now().toString();
    const concatenatedStringKey = timestamp;
    const hmac = crypto.createHmac('sha256', encodedKey);
    hmac.update(concatenatedStringKey);
    const signature = hmac.digest('base64');

    let headers: Record<string, string> = {
        'developer_key': EKO_DEV_KEY || '',
        'secret-key-timestamp': timestamp,
        'secret-key': signature,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
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
    return withCache('bbps:categories', async () => {
        const { EKO_BASE_URL, EKO_INITIATOR_ID, EKO_USER_CODE } = requireEkoConfig();
        const headers = getEkoHeaders();
        const url = `${getBbpsReadBaseUrl(EKO_BASE_URL)}/customer/payment/bbps/categories?${buildQuery({ initiator_id: EKO_INITIATOR_ID, user_code: EKO_USER_CODE })}`;
        const response = await axios.get(url, { headers });
        return response.data;
    });
};

/**
 * BBPS: Fetch Locations (Section 2.2)
 */
export const fetchLocations = async () => {
    return withCache('bbps:locations', async () => {
        const { EKO_BASE_URL, EKO_INITIATOR_ID, EKO_USER_CODE } = requireEkoConfig();
        const headers = getEkoHeaders();
        const url = `${getBbpsReadBaseUrl(EKO_BASE_URL)}/customer/payment/bbps/locations?${buildQuery({ initiator_id: EKO_INITIATOR_ID, user_code: EKO_USER_CODE })}`;
        const response = await axios.get(url, { headers });
        return response.data;
    });
};

/**
 * BBPS: Fetch Operators (Section 2.3)
 */
export const fetchBBPSOperators = async (categoryId?: string, locationId?: string) => {
    return withCache(`bbps:operators:${categoryId || 'all'}:${locationId || 'all'}`, async () => {
        const { EKO_BASE_URL, EKO_INITIATOR_ID, EKO_USER_CODE } = requireEkoConfig();
        const headers = getEkoHeaders();
        const url = `${getBbpsReadBaseUrl(EKO_BASE_URL)}/customer/payment/bbps/operators?${buildQuery({
            initiator_id: EKO_INITIATOR_ID,
            user_code: EKO_USER_CODE,
            category: categoryId,
            location: locationId
        })}`;
        const response = await axios.get(url, { headers });
        return response.data;
    }, 60 * 60 * 1000);
};

/**
 * BBPS: Fetch Operator Parameters (Section 2.4)
 */
export const fetchOperatorParameters = async (operatorId: string) => {
    return withCache(`bbps:operator:${operatorId}:params`, async () => {
        const { EKO_BASE_URL, EKO_INITIATOR_ID, EKO_USER_CODE } = requireEkoConfig();
        const headers = getEkoHeaders();
        const url = `${getBbpsReadBaseUrl(EKO_BASE_URL)}/customer/payment/bbps/operator/${operatorId}/parameters?${buildQuery({ initiator_id: EKO_INITIATOR_ID, user_code: EKO_USER_CODE })}`;
        const response = await axios.get(url, { headers });
        return response.data;
    });
};

// ─── Recharge Flow ─────────────────────────────────────────────────────

/**
 * Get Operator Code and Circle for a Mobile Number (Recharge flow)
 */
export const getOperatorCodeAndCircle = async (mobile: string) => {
    const { EKO_BASE_URL, EKO_INITIATOR_ID, EKO_USER_CODE } = requireEkoConfig();
    const headers = getEkoHeaders();
    const url = `${EKO_BASE_URL}/customer/payment/bbps/recharge/${mobile}/operator?${buildQuery({ initiator_id: EKO_INITIATOR_ID, user_code: EKO_USER_CODE })}`;
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
    const { EKO_BASE_URL, EKO_INITIATOR_ID, EKO_USER_CODE } = requireEkoConfig();
    const headers = getEkoHeaders();
    const url = `${EKO_BASE_URL}/customer/payment/bbps/recharge/${mobile}/operator/plans?${buildQuery({
        initiator_id: EKO_INITIATOR_ID,
        user_code: EKO_USER_CODE,
        phone_operator_code,
        circleid
    })}`;
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
    const { EKO_BASE_URL, EKO_INITIATOR_ID, EKO_USER_CODE, EKO_LATLONG } = requireEkoConfig();
    const headers = getEkoHeaders();

    const query = buildQuery({
        initiator_id: EKO_INITIATOR_ID,
        user_code: EKO_USER_CODE,
        latlong: EKO_LATLONG,
        sender_name: params.sender_name || 'Customer',
        ...params
    });

    const url = `${getBbpsReadBaseUrl(EKO_BASE_URL)}/customer/payment/bbps/bill?${query}`;
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
    const { EKO_BASE_URL, EKO_INITIATOR_ID, EKO_USER_CODE, EKO_LATLONG } = requireEkoConfig();
    const requestHashString = `${params.utility_acc_no}${params.amount}${EKO_USER_CODE}`;
    const headers = getEkoHeaders(requestHashString);
    const url = `${EKO_BASE_URL}/customer/payment/bbps`;

    const payload: Record<string, any> = {
        initiator_id: EKO_INITIATOR_ID,
        user_code: EKO_USER_CODE,
        latlong: params.latlong || EKO_LATLONG,
        ...params
    };

    if (payload.billfetchresponse && typeof payload.billfetchresponse !== 'string') {
        payload.billfetchresponse = JSON.stringify(payload.billfetchresponse);
    }

    console.log(`[EKO Pay] Calling Eko POST /customer/payment/bbps for account: ${params.utility_acc_no}, amount: ₹${params.amount}, operator: ${params.phone_operator_code}, category: ${params.category}, client_ref_id: ${params.client_ref_id}`);
    
    try {
        const response = await axios.post(url, payload, { headers });
        console.log(`[EKO Pay] Response received: Status ${response.status}`, JSON.stringify(response.data));
        return response.data;
    } catch (error: any) {
        console.error(`[EKO Pay] Error from Eko API:`, error.response?.status, JSON.stringify(error.response?.data || error.message));
        throw error;
    }
};
