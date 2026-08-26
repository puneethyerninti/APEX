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
        'secret-key': signature,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
    };
};

async function testBBPS() {
    console.log("Testing BBPS Categories...");
    const headers = getEkoHeaders();
    const url = `https://api.eko.in:25002/ekoicici/v3/customer/payment/bbps/categories?initiator_id=${EKO_INITIATOR_ID}`;
    
    try {
        const res = await axios.get(url, { headers });
        console.log("SUCCESS:");
        console.log(JSON.stringify(res.data, null, 2));
    } catch (e) {
        console.log("ERROR STATUS:", e.response?.status);
        console.log("ERROR DATA:", JSON.stringify(e.response?.data, null, 2));
    }
}
testBBPS();
