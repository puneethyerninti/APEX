"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUtilityOperators = exports.activateService = exports.fetchBill = exports.fetchOperatorParameters = exports.fetchBBPSOperators = exports.fetchLocations = exports.fetchCategories = exports.processRecharge = exports.fetchRechargePlans = exports.getOperatorCodeAndCircle = exports.getEkoHeaders = void 0;
const crypto_1 = __importDefault(require("crypto"));
const axios_1 = __importDefault(require("axios"));
// Environment Variables
const EKO_DEV_KEY = process.env.EKO_DEV_KEY || '9a40fb2f68f06c86581737e05b58cd3e';
const EKO_ACCESS_KEY = process.env.EKO_ACCESS_KEY || 'd49acab3-ed93-4f44-a366-3ff6746dc58d';
const EKO_INITIATOR_ID = process.env.EKO_INITIATOR_ID || '6303210224';
const EKO_BASE_URL = process.env.EKO_BASE_URL || 'https://api.eko.in:25002/ekoicici';
/**
 * Generates Eko Authentication headers
 */
const getEkoHeaders = (requestHashString) => {
    const timestamp = Date.now().toString();
    // Eko requires the key to be converted to base64, then passed to HMAC.
    // Using Buffer.from(key) uses UTF-8 by default, exactly as Eko expects.
    const encodedKey = Buffer.from(EKO_ACCESS_KEY).toString('base64');
    const accessKeyBuffer = Buffer.from(encodedKey, 'base64');
    const hmac = crypto_1.default.createHmac('sha256', accessKeyBuffer);
    hmac.update(timestamp);
    const signature = hmac.digest('base64');
    const headers = {
        'developer_key': EKO_DEV_KEY,
        'secret-key-timestamp': timestamp,
        'secret-key': signature,
        'Accept': 'application/json'
    };
    if (requestHashString) {
        // Concatenate timestamp and the required parameters
        const concatenatedString = timestamp + requestHashString;
        const requestHmac = crypto_1.default.createHmac('sha256', accessKeyBuffer);
        requestHmac.update(concatenatedString);
        headers['request_hash'] = requestHmac.digest('base64');
    }
    return headers;
};
exports.getEkoHeaders = getEkoHeaders;
/**
 * Get Operator Code and Circle for a Mobile Number
 */
const getOperatorCodeAndCircle = async (mobile) => {
    try {
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
    }
    catch (error) {
        console.error('Error in getOperatorCodeAndCircle', error.response?.data || error.message);
        throw error;
    }
};
exports.getOperatorCodeAndCircle = getOperatorCodeAndCircle;
/**
 * Fetch Mobile Recharge Plans
 */
const fetchRechargePlans = async (mobile, phone_operator_code, circleid) => {
    try {
        const headers = (0, exports.getEkoHeaders)();
        const url = `${EKO_BASE_URL}/customer/payment/bbps/recharge/${mobile}/operator/plans?initiator_id=${EKO_INITIATOR_ID}&phone_operator_code=${phone_operator_code}&circleid=${circleid}`;
        const response = await axios_1.default.get(url, { headers });
        const resData = response.data;
        if (resData.status !== 0 || !resData.dependent_params) {
            throw new Error(resData.message || 'Failed to fetch plans');
        }
        // Find req_list
        const reqListObj = resData.dependent_params.find((p) => p.name === 'req_list');
        if (!reqListObj || !reqListObj.value) {
            return []; // No plans found
        }
        const typeMetadata = reqListObj.type_metadata?.[0]?.headers || [];
        // Map Eko's generic response to our UI schema
        const mappedPlans = reqListObj.value.map((plan, index) => {
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
    }
    catch (error) {
        console.error('Error fetching plans', error.response?.data || error.message);
        throw error;
    }
};
exports.fetchRechargePlans = fetchRechargePlans;
const extractDataText = (desc) => {
    const match = desc.match(/(\d+(\.\d+)?\s?(GB|MB)(\/day)?)/i);
    return match ? match[0] : 'Check Description';
};
/**
 * Process a recharge transaction
 */
const processRecharge = async (mobile, amount, operatorCode, clientRefId) => {
    try {
        const USER_CODE = '42290001'; // Given by Eko Support
        const requestHashString = `${mobile}${amount}${USER_CODE}`;
        const headers = (0, exports.getEkoHeaders)(requestHashString);
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
        const response = await axios_1.default.post(url, payload, { headers });
        const resData = response.data;
        if (resData.status === 0 || resData.response_type_id === 333) {
            return {
                status: 0,
                message: resData.message || 'Transaction Successful',
                txid: resData.data?.tid || clientRefId,
                data: resData.data
            };
        }
        else {
            return {
                status: 1,
                message: resData.message || 'Transaction Failed',
                error: resData
            };
        }
    }
    catch (error) {
        console.error('Error processing recharge', error.response?.data || error.message);
        throw error;
    }
};
exports.processRecharge = processRecharge;
/**
 * BBPS: Fetch Categories
 */
const fetchCategories = async () => {
    try {
        const headers = (0, exports.getEkoHeaders)();
        const url = `${EKO_BASE_URL}/customer/payment/bbps/categories?initiator_id=${EKO_INITIATOR_ID}`;
        const response = await axios_1.default.get(url, { headers });
        return response.data;
    }
    catch (error) {
        console.error('Error fetching categories', error.response?.data || error.message);
        throw error;
    }
};
exports.fetchCategories = fetchCategories;
/**
 * BBPS: Fetch Locations
 */
const fetchLocations = async () => {
    try {
        const headers = (0, exports.getEkoHeaders)();
        const url = `${EKO_BASE_URL}/customer/payment/bbps/locations?initiator_id=${EKO_INITIATOR_ID}`;
        const response = await axios_1.default.get(url, { headers });
        return response.data;
    }
    catch (error) {
        console.error('Error fetching locations', error.response?.data || error.message);
        throw error;
    }
};
exports.fetchLocations = fetchLocations;
/**
 * BBPS: Fetch Operators
 */
const fetchBBPSOperators = async (categoryId, locationId) => {
    try {
        const headers = (0, exports.getEkoHeaders)();
        let url = `${EKO_BASE_URL}/customer/payment/bbps/operators?initiator_id=${EKO_INITIATOR_ID}`;
        if (categoryId)
            url += `&category=${categoryId}`;
        if (locationId)
            url += `&location=${locationId}`;
        const response = await axios_1.default.get(url, { headers });
        return response.data;
    }
    catch (error) {
        console.error('Error fetching operators', error.response?.data || error.message);
        throw error;
    }
};
exports.fetchBBPSOperators = fetchBBPSOperators;
/**
 * BBPS: Fetch Operator Parameters
 */
const fetchOperatorParameters = async (operatorId) => {
    try {
        const headers = (0, exports.getEkoHeaders)();
        const url = `${EKO_BASE_URL}/customer/payment/bbps/operator/${operatorId}/parameters?initiator_id=${EKO_INITIATOR_ID}`;
        const response = await axios_1.default.get(url, { headers });
        return response.data;
    }
    catch (error) {
        console.error('Error fetching operator parameters', error.response?.data || error.message);
        throw error;
    }
};
exports.fetchOperatorParameters = fetchOperatorParameters;
/**
 * BBPS: Fetch Bill
 */
const fetchBill = async (params) => {
    try {
        const headers = (0, exports.getEkoHeaders)();
        // Construct query string dynamically from the input parameters
        const queryParams = new URLSearchParams({
            initiator_id: EKO_INITIATOR_ID,
            ...params
        });
        const url = `${EKO_BASE_URL}/customer/payment/bbps/bill?${queryParams.toString()}`;
        const response = await axios_1.default.get(url, { headers });
        return response.data;
    }
    catch (error) {
        console.error('Error fetching bill', error.response?.data || error.message);
        throw error;
    }
};
exports.fetchBill = fetchBill;
/**
 * Activate a Service for the User
 */
const activateService = async (serviceCode) => {
    try {
        const headers = (0, exports.getEkoHeaders)();
        const USER_CODE = '42290001';
        // Reverted URL based on latest documentation screenshot
        const url = `${EKO_BASE_URL}/v3/admin/network/agent/${USER_CODE}/service/${serviceCode}/activate`;
        const payload = {
            initiator_id: EKO_INITIATOR_ID,
            client_ref_id: 'ACT_' + Date.now()
        };
        const response = await axios_1.default.put(url, payload, { headers });
        return response.data;
    }
    catch (error) {
        console.error('Error activating service', error.response?.data || error.message);
        throw error;
    }
};
exports.activateService = activateService;
/**
 * Kept for backward compatibility if needed by DTH or other services
 */
const getUtilityOperators = async () => {
    return [
        { id: 1, name: 'Airtel', category: 'Mobile' },
        { id: 2, name: 'Jio', category: 'Mobile' },
        { id: 3, name: 'VI', category: 'Mobile' },
        { id: 4, name: 'BSNL', category: 'Mobile' },
        { id: 5, name: 'Tata Play', category: 'DTH' },
        { id: 6, name: 'Airtel Digital TV', category: 'DTH' }
    ];
};
exports.getUtilityOperators = getUtilityOperators;
