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
    const bases = [
        'https://api.eko.in:25002/ekoicici/v3',
        'https://api.eko.in/ekoicici/v3',
        'https://api.eko.in:25002/ekoicici/v1',
    ];

    for (const base of bases) {
        console.log(`\n=== BASE: ${base} ===`);
        const headers = getEkoHeaders();
        
        try {
            const res = await axios.get(`${base}/customer/payment/bbps/categories?initiator_id=${EKO_INITIATOR_ID}`, { headers, timeout: 5000 });
            console.log("CATEGORIES SUCCESS! Status:", res.data.status);
            console.log("Data:", JSON.stringify(res.data).substring(0, 500));
            return; // Stop if we find the working one
        } catch (e) {
            console.log("CATEGORIES ERROR:", e.response?.status || e.code, JSON.stringify(e.response?.data || e.message).substring(0, 200));
        }
    }

    // Also try the user_code based URL pattern
    console.log("\n=== Trying with user_code in path ===");
    const headers = getEkoHeaders();
    const USER_CODE = '42290001';
    try {
        const res = await axios.get(`https://api.eko.in:25002/ekoicici/v3/customer/${USER_CODE}/payment/bbps/categories?initiator_id=${EKO_INITIATOR_ID}`, { headers, timeout: 5000 });
        console.log("SUCCESS:", JSON.stringify(res.data).substring(0, 500));
    } catch (e) {
        console.log("ERROR:", e.response?.status || e.code, JSON.stringify(e.response?.data || e.message).substring(0, 200));
    }

    // Try Get User's Services to see what services are enabled
    console.log("\n=== Get User's Services ===");
    const headers2 = getEkoHeaders();
    try {
        const res = await axios.get(`https://api.eko.in:25002/ekoicici/v3/admin/network/agent/${USER_CODE}/services?initiator_id=${EKO_INITIATOR_ID}`, { headers: headers2, timeout: 5000 });
        console.log("SUCCESS:", JSON.stringify(res.data, null, 2));
    } catch (e) {
        console.log("ERROR:", e.response?.status || e.code, JSON.stringify(e.response?.data || e.message).substring(0, 200));
    }
}
testAll();
