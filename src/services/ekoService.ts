import crypto from 'crypto';
import axios from 'axios';

// UAT API Keys (Test)
const EKO_DEV_KEY = process.env.EKO_DEV_KEY || 'becbbce45f79c6f5109f848acd540567';
const EKO_ACCESS_KEY = process.env.EKO_ACCESS_KEY || 'd2fe1d99-6298-4af2-8cc5-d97dcf46df30';
const EKO_BASE_URL = 'https://staging.eko.in:25004/ekoapi/v1';

/**
 * Generates Eko Authentication headers
 */
export const getEkoHeaders = () => {
    const timestamp = Date.now().toString();
    const hmac = crypto.createHmac('sha256', EKO_ACCESS_KEY);
    hmac.update(timestamp);
    const signature = hmac.digest('base64');

    return {
        'developer_key': EKO_DEV_KEY,
        'secret-key-timestamp': timestamp,
        'secret-key': signature,
        'Content-Type': 'application/x-www-form-urlencoded'
    };
};

/**
 * Fetch list of telecom operators (Mobile/DTH)
 */
export const getUtilityOperators = async () => {
    try {
        // Mock response for now to ensure front-end can be built.
        // Eko requires precise endpoints for operator fetch, which can vary based on API version.
        return [
            { id: 1, name: 'Airtel', category: 'Mobile' },
            { id: 2, name: 'Jio', category: 'Mobile' },
            { id: 3, name: 'VI', category: 'Mobile' },
            { id: 4, name: 'BSNL', category: 'Mobile' },
            { id: 5, name: 'Tata Play', category: 'DTH' },
            { id: 6, name: 'Airtel Digital TV', category: 'DTH' }
        ];
    } catch (error) {
        console.error('Error fetching operators', error);
        throw error;
    }
};

/**
 * Process a recharge transaction
 */
export const processRecharge = async (mobile: string, amount: number, operator: string) => {
    try {
        const headers = getEkoHeaders();
        // Mock success response for UAT
        return {
            status: 0,
            message: 'Transaction Successful',
            txid: 'EKO' + Date.now(),
            data: {
                amount,
                mobile,
                operator,
                status: 'success'
            }
        };
    } catch (error) {
        console.error('Error processing recharge', error);
        throw error;
    }
};

/**
 * Fetch Mobile Recharge Plans for an Operator
 */
export const fetchRechargePlans = async (operator: string) => {
    try {
        // In production, this would call Eko API: /tools/reference/plans?operator=...
        // For now, we mock realistic plans to build the PhonePe-style UI
        const isJio = operator.toLowerCase().includes('jio');
        const isAirtel = operator.toLowerCase().includes('airtel');
        
        return [
            {
                id: 'plan_299',
                category: 'Popular',
                price: isJio ? 299 : 349,
                data: '2GB/Day',
                validity: '28 Days',
                description: 'Unlimited Calls + 100 SMS/Day'
            },
            {
                id: 'plan_719',
                category: 'Popular',
                price: isJio ? 719 : 799,
                data: '2GB/Day',
                validity: '84 Days',
                description: 'Unlimited Calls + 100 SMS/Day + Free OTT Subscriptions'
            },
            {
                id: 'plan_199',
                category: 'Unlimited',
                price: isJio ? 199 : 239,
                data: '1.5GB/Day',
                validity: '23 Days',
                description: 'Unlimited Calls + 100 SMS/Day'
            },
            {
                id: 'plan_19',
                category: 'Data Add-on',
                price: isJio ? 19 : 29,
                data: '1.5GB',
                validity: 'Existing Plan',
                description: 'High-speed data add-on'
            },
            {
                id: 'plan_61',
                category: 'Data Add-on',
                price: isJio ? 61 : 65,
                data: '6GB',
                validity: 'Existing Plan',
                description: 'High-speed data add-on'
            },
            {
                id: 'plan_2999',
                category: 'Annual',
                price: isJio ? 2999 : 3359,
                data: '2.5GB/Day',
                validity: '365 Days',
                description: 'Unlimited Calls + Free OTT Subscriptions for 1 Year'
            }
        ];
    } catch (error) {
        console.error('Error fetching plans', error);
        throw error;
    }
};
