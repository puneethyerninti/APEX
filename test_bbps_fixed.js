const crypto = require('crypto');
const axios = require('axios');

const EKO_DEV_KEY = '9a40fb2f68f06c86581737e05b58cd3e';
const EKO_ACCESS_KEY = 'd49acab3-ed93-4f44-a366-3ff6746dc58d';
const EKO_INITIATOR_ID = '6303210224';

const getEkoHeaders = () => {
    const timestamp = Date.now().toString();
    // FIXED: use base64-encoded string directly as the HMAC key
    const encodedKey = Buffer.from(EKO_ACCESS_KEY).toString('base64');
    const hmac = crypto.createHmac('sha256', encodedKey);
    hmac.update(timestamp);
    const signature = hmac.digest('base64');

    return {
        'developer_key': EKO_DEV_KEY,
        'secret-key-timestamp': timestamp,
        'secret-key': signature,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
    };
};

async function testAll() {
    const BASE = 'https://api.eko.in:25002/ekoicici/v3';

    console.log("=== TEST 1: Get Categories ===");
    try {
        const headers = getEkoHeaders();
        const res = await axios.get(`${BASE}/customer/payment/bbps/categories?initiator_id=${EKO_INITIATOR_ID}`, { headers });
        console.log("SUCCESS! Status:", res.data.status);
        const cats = res.data.param_attributes?.list_elements?.slice(0, 5);
        console.log("First 5 categories:", JSON.stringify(cats, null, 2));
    } catch (e) {
        console.log("ERROR:", e.response?.status, JSON.stringify(e.response?.data).substring(0, 200));
    }

    console.log("\n=== TEST 2: Get Locations ===");
    try {
        const headers = getEkoHeaders();
        const res = await axios.get(`${BASE}/customer/payment/bbps/locations?initiator_id=${EKO_INITIATOR_ID}`, { headers });
        console.log("SUCCESS! Status:", res.data.status);
        const locs = res.data.param_attributes?.list_elements?.slice(0, 3);
        console.log("First 3 locations:", JSON.stringify(locs, null, 2));
    } catch (e) {
        console.log("ERROR:", e.response?.status, JSON.stringify(e.response?.data).substring(0, 200));
    }

    console.log("\n=== TEST 3: Get Operators ===");
    try {
        const headers = getEkoHeaders();
        const res = await axios.get(`${BASE}/customer/payment/bbps/operators?initiator_id=${EKO_INITIATOR_ID}`, { headers });
        console.log("SUCCESS! Status:", res.data.status);
        const ops = res.data.param_attributes?.list_elements?.slice(0, 3);
        console.log("First 3 operators:", JSON.stringify(ops, null, 2));
    } catch (e) {
        console.log("ERROR:", e.response?.status, JSON.stringify(e.response?.data).substring(0, 200));
    }
}
testAll();
