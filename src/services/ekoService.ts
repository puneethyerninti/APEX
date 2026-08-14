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
