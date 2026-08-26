const crypto = require('crypto');
const axios = require('axios');

const EKO_DEV_KEY = '9a40fb2f68f06c86581737e05b58cd3e';
const EKO_ACCESS_KEY = 'd49acab3-ed93-4f44-a366-3ff6746dc58d';
const EKO_INITIATOR_ID = '6303210224';

const getEkoHeaders = () => {
    const timestamp = Date.now().toString();
    const encodedKey = Buffer.from(EKO_ACCESS_KEY).toString('base64');
    const accessKeyBuffer = Buffer.from(encodedKey, 'base64');
    const hmac = crypto.createHmac('sha256', accessKeyBuffer);
    hmac.update(timestamp);
    const signature = hmac.digest('base64');

    return {
        'developer_key': EKO_DEV_KEY,
        'secret-key-timestamp': timestamp,
        'secret-key': signature
    };
};

async function testAll() {
    const headers = getEkoHeaders();
    
    // PDF says: https://api.eko.in/ekoicici/v3 (NO port 25002!)
    const BASE = 'https://api.eko.in/ekoicici/v3';
    
    console.log("=== TEST 1: Get Categories (PDF Base URL, no port) ===");
    try {
        const res = await axios.get(`${BASE}/customer/payment/bbps/categories?initiator_id=${EKO_INITIATOR_ID}`, { headers });
        console.log("STATUS:", res.data.status);
        console.log("DATA:", JSON.stringify(res.data).substring(0, 300));
    } catch (e) {
        console.log("ERROR:", e.response?.status, JSON.stringify(e.response?.data).substring(0, 200));
    }

    console.log("\n=== TEST 2: Get Locations ===");
    try {
        const res = await axios.get(`${BASE}/customer/payment/bbps/locations?initiator_id=${EKO_INITIATOR_ID}`, { headers });
        console.log("STATUS:", res.data.status);
        console.log("DATA:", JSON.stringify(res.data).substring(0, 300));
    } catch (e) {
        console.log("ERROR:", e.response?.status, JSON.stringify(e.response?.data).substring(0, 200));
    }

    console.log("\n=== TEST 3: Get Operators ===");
    try {
        const res = await axios.get(`${BASE}/customer/payment/bbps/operators?initiator_id=${EKO_INITIATOR_ID}`, { headers });
        console.log("STATUS:", res.data.status);
        console.log("DATA:", JSON.stringify(res.data).substring(0, 300));
    } catch (e) {
        console.log("ERROR:", e.response?.status, JSON.stringify(e.response?.data).substring(0, 200));
    }
}
testAll();
