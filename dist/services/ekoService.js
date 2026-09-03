"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.payBBPSBill = exports.fetchBill = exports.fetchRechargePlans = exports.getOperatorCodeAndCircle = exports.fetchOperatorParameters = exports.fetchBBPSOperators = exports.fetchLocations = exports.fetchCategories = exports.getEkoHeaders = void 0;
const crypto_1 = __importDefault(require("crypto"));
const axios_1 = __importDefault(require("axios"));
// ─── Eko Configuration (Dynamic getters to support dotenv loading late) ─────────
const getEkoConfig = () => {
    const EKO_DEV_KEY = process.env.EKO_DEV_KEY;
    const EKO_ACCESS_KEY = process.env.EKO_ACCESS_KEY;
    const EKO_INITIATOR_ID = process.env.EKO_INITIATOR_ID;
    const EKO_BASE_URL = (process.env.EKO_BASE_URL || 'https://api.eko.in:25002/ekoicici/v3').replace(/\/$/, '');
    if (!EKO_DEV_KEY || !EKO_ACCESS_KEY || !EKO_INITIATOR_ID) {
        console.error('CRITICAL: Eko API credentials missing! Set EKO_DEV_KEY, EKO_ACCESS_KEY, EKO_INITIATOR_ID on Render.');
    }
    return { EKO_DEV_KEY, EKO_ACCESS_KEY: EKO_ACCESS_KEY || '', EKO_INITIATOR_ID, EKO_BASE_URL };
};
/**
 * Generates Eko Authentication headers (HMAC-SHA256)
 */
const getEkoHeaders = (requestHashString) => {
    const { EKO_DEV_KEY, EKO_ACCESS_KEY } = getEkoConfig();
    // Eko requires the plain text key to be base64 encoded BEFORE being used for HMAC
    const encodedKey = Buffer.from(EKO_ACCESS_KEY).toString('base64');
    const timestamp = Date.now().toString();
    const concatenatedStringKey = timestamp;
    const hmac = crypto_1.default.createHmac('sha256', encodedKey);
    hmac.update(concatenatedStringKey);
    const signature = hmac.digest('base64');
    let headers = {
        'developer_key': EKO_DEV_KEY || '',
        'secret-key-timestamp': timestamp,
        'secret-key': signature,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
    };
    if (requestHashString) {
        const concatenatedString = timestamp + requestHashString;
        const requestHmac = crypto_1.default.createHmac('sha256', encodedKey);
        requestHmac.update(concatenatedString);
        headers['request_hash'] = requestHmac.digest('base64');
    }
    return headers;
};
exports.getEkoHeaders = getEkoHeaders;
// ─── Discovery & Lookups ───────────────────────────────────────────────
/**
 * BBPS: Fetch Categories (Section 2.1)
 */
const fetchCategories = async () => {
    const { EKO_BASE_URL, EKO_INITIATOR_ID } = getEkoConfig();
    const headers = (0, exports.getEkoHeaders)();
    const url = `${EKO_BASE_URL}/customer/payment/bbps/categories?initiator_id=${EKO_INITIATOR_ID}`;
    const response = await axios_1.default.get(url, { headers });
    return response.data;
};
exports.fetchCategories = fetchCategories;
/**
 * BBPS: Fetch Locations (Section 2.2)
 */
const fetchLocations = async () => {
    const { EKO_BASE_URL, EKO_INITIATOR_ID } = getEkoConfig();
    const headers = (0, exports.getEkoHeaders)();
    const url = `${EKO_BASE_URL}/customer/payment/bbps/locations?initiator_id=${EKO_INITIATOR_ID}`;
    const response = await axios_1.default.get(url, { headers });
    return response.data;
};
exports.fetchLocations = fetchLocations;
/**
 * BBPS: Fetch Operators (Section 2.3)
 */
const fetchBBPSOperators = async (categoryId, locationId) => {
    const { EKO_BASE_URL, EKO_INITIATOR_ID } = getEkoConfig();
    const headers = (0, exports.getEkoHeaders)();
    let url = `${EKO_BASE_URL}/customer/payment/bbps/operators?initiator_id=${EKO_INITIATOR_ID}`;
    if (categoryId)
        url += `&category=${categoryId}`;
    if (locationId)
        url += `&location=${locationId}`;
    const response = await axios_1.default.get(url, { headers });
    return response.data;
};
exports.fetchBBPSOperators = fetchBBPSOperators;
/**
 * BBPS: Fetch Operator Parameters (Section 2.4)
 */
const fetchOperatorParameters = async (operatorId) => {
    const { EKO_BASE_URL, EKO_INITIATOR_ID } = getEkoConfig();
    const headers = (0, exports.getEkoHeaders)();
    const url = `${EKO_BASE_URL}/customer/payment/bbps/operator/${operatorId}/parameters?initiator_id=${EKO_INITIATOR_ID}`;
    const response = await axios_1.default.get(url, { headers });
    return response.data;
};
exports.fetchOperatorParameters = fetchOperatorParameters;
// ─── Recharge Flow ─────────────────────────────────────────────────────
/**
 * Get Operator Code and Circle for a Mobile Number (Recharge flow)
 */
const getOperatorCodeAndCircle = async (mobile) => {
    const { EKO_BASE_URL, EKO_INITIATOR_ID } = getEkoConfig();
    const headers = (0, exports.getEkoHeaders)();
    const url = `${EKO_BASE_URL}/customer/payment/bbps/recharge/${mobile}/operator?initiator_id=${EKO_INITIATOR_ID}`;
    const response = await axios_1.default.get(url, { headers });
    const resData = response.data;
    if (resData.status !== 0 || !resData.dependent_params) {
        throw new Error(resData.message || 'Failed to detect operator');
    }
    let phone_operator_code = '';
    let circle_area = '';
    resData.dependent_params.forEach((param) => {
        if (param.name === 'phone_operator_code')
            phone_operator_code = param.value;
        if (param.name === 'circle_area')
            circle_area = param.value;
    });
    return { phone_operator_code, circleid: circle_area };
};
exports.getOperatorCodeAndCircle = getOperatorCodeAndCircle;
/**
 * Fetch Mobile Recharge Plans — returns all plan categories, filters out zero-price entries
 */
const fetchRechargePlans = async (mobile, phone_operator_code, circleid) => {
    const { EKO_BASE_URL, EKO_INITIATOR_ID } = getEkoConfig();
    const headers = (0, exports.getEkoHeaders)();
    const url = `${EKO_BASE_URL}/customer/payment/bbps/recharge/${mobile}/operator/plans?initiator_id=${EKO_INITIATOR_ID}&phone_operator_code=${phone_operator_code}&circleid=${circleid}`;
    const response = await axios_1.default.get(url, { headers });
    const resData = response.data;
    if (resData.status !== 0 || !resData.dependent_params) {
        throw new Error(resData.message || 'Failed to fetch plans');
    }
    const reqListObj = resData.dependent_params.find((p) => p.name === 'req_list');
    if (!reqListObj || !reqListObj.value) {
        return [];
    }
    // Flatten all plans — handles both grouped [{category, list:[]}] and flat array formats
    let allPlans = [];
    const rawList = reqListObj.value;
    if (Array.isArray(rawList)) {
        if (rawList.length > 0 && rawList[0].list) {
            // Category-grouped format
            rawList.forEach((group) => {
                if (Array.isArray(group.list)) {
                    group.list.forEach((plan) => {
                        allPlans.push({ ...plan, category_name: group.category || group.plan_name || 'General' });
                    });
                }
            });
        }
        else {
            // Flat list format
            allPlans = rawList.map((plan) => ({ ...plan, category_name: 'All Plans' }));
        }
    }
    const mappedPlans = allPlans
        .filter((plan) => parseFloat(plan.amount || plan.price || '0') > 0) // Remove ₹0 plans
        .map((plan, index) => ({
        id: `plan_${plan.amount || plan.price}_${index}`,
        category: plan.category_name || 'All Plans',
        price: parseFloat(plan.amount || plan.price || '0'),
        data: extractDataText(plan.plan_description || plan.desc || ''),
        validity: plan.validity || plan.plan_validity || 'N/A',
        description: plan.plan_description || plan.desc || 'Recharge Plan'
    }));
    return mappedPlans;
};
exports.fetchRechargePlans = fetchRechargePlans;
const extractDataText = (desc) => {
    if (!desc)
        return 'N/A';
    const match = desc.match(/(\d+(\.\d+)?\s?(GB|MB)(\/day)?)/i);
    return match ? match[0] : 'N/A';
};
// ─── Bill Fetch & Pay ──────────────────────────────────────────────────
/**
 * BBPS: Fetch Bill (Section 5 of Eko PDF)
 * Uses clean query string encoding — source_ip NOT needed for GET fetch.
 */
const fetchBill = async (params) => {
    const { EKO_BASE_URL, EKO_INITIATOR_ID } = getEkoConfig();
    const headers = (0, exports.getEkoHeaders)();
    // Build clean query string — skip empty/null values, don't send source_ip in GET
    const queryParts = [`initiator_id=${encodeURIComponent(EKO_INITIATOR_ID || '')}`];
    Object.entries(params).forEach(([key, val]) => {
        if (key === 'source_ip')
            return; // Not needed for GET bill fetch
        if (val !== undefined && val !== null && val !== '') {
            queryParts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(val))}`);
        }
    });
    const url = `${EKO_BASE_URL}/customer/payment/bbps/bill?${queryParts.join('&')}`;
    console.log('[EKO] fetchBill URL:', url);
    const response = await axios_1.default.get(url, { headers });
    console.log('[EKO] fetchBill response:', JSON.stringify(response.data));
    return response.data;
};
exports.fetchBill = fetchBill;
/**
 * BBPS: Pay Bill / Process Recharge (Section 6 of Eko PDF)
 * POST endpoint. Requires request_hash for financial transactions.
 */
const payBBPSBill = async (params) => {
    const { EKO_BASE_URL, EKO_INITIATOR_ID } = getEkoConfig();
    // In Eko, user_code is typically the initiator_id unless explicitly provided otherwise.
    const USER_CODE = process.env.EKO_USER_CODE || EKO_INITIATOR_ID;
    const requestHashString = `${params.utility_acc_no}${params.amount}${USER_CODE}`;
    const headers = (0, exports.getEkoHeaders)(requestHashString);
    const url = `${EKO_BASE_URL}/customer/payment/bbps`;
    const payload = {
        initiator_id: EKO_INITIATOR_ID,
        ...params
    };
    console.log(`[EKO Pay] Calling Eko POST /customer/payment/bbps for account: ${params.utility_acc_no}, amount: ₹${params.amount}, operator: ${params.phone_operator_code}, category: ${params.category}, client_ref_id: ${params.client_ref_id}`);
    try {
        const response = await axios_1.default.post(url, payload, { headers });
        console.log(`[EKO Pay] Response received: Status ${response.status}`, JSON.stringify(response.data));
        return response.data;
    }
    catch (error) {
        console.error(`[EKO Pay] Error from Eko API:`, error.response?.status, JSON.stringify(error.response?.data || error.message));
        throw error;
    }
};
exports.payBBPSBill = payBBPSBill;
