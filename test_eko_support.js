const crypto = require('crypto');
const axios = require('axios');

const EKO_DEV_KEY = '9a40fb2f68f06c86581737e05b58cd3e';
const EKO_ACCESS_KEY = 'd49acab3-ed93-4f44-a366-3ff6746dc58d';
const EKO_INITIATOR_ID = '6303210224';

const getEkoHeaders = () => {
    const timestamp = Date.now().toString();
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

async function testFetch() {
    const url = 'https://api.eko.in:25002/ekoicici/v3/customer/payment/bbps/bill?initiator_id=6303210224&phone_operator_code=164&utility_acc_no=116616T008000155&confirmation_mobile_no=9999999999';
    
    // They say to use --data with GET request
    const data = {
        "initiator_id": "6303210224",
        "phone_operator_code": "164",
        "utility_acc_no": "116616T008000155",
        "confirmation_mobile_no": "9876543210"
    };

    console.log("=== TEST Fetch Bill (Eko Support Exact) ===");
    try {
        const headers = getEkoHeaders();
        const res = await axios.get(url, { headers, data });
        console.log("SUCCESS! Status:", res.status);
        console.log("Response:", JSON.stringify(res.data, null, 2));
    } catch (e) {
        console.log("ERROR:", e.response?.status, JSON.stringify(e.response?.data, null, 2));
    }
}
testFetch();
