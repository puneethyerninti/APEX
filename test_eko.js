require('dotenv').config({ path: './.env' });
const crypto = require('crypto');
const axios = require('axios');

const EKO_DEV_KEY = process.env.EKO_DEV_KEY;
const EKO_ACCESS_KEY = process.env.EKO_ACCESS_KEY;
const EKO_INITIATOR_ID = process.env.EKO_INITIATOR_ID;
const EKO_BASE_URL = process.env.EKO_BASE_URL;

console.log('Testing EKO API with following config:');
console.log('BASE URL:', EKO_BASE_URL);
console.log('DEV KEY:', EKO_DEV_KEY);
console.log('INITIATOR_ID:', EKO_INITIATOR_ID);

const getEkoHeaders = () => {
    const timestamp = Date.now().toString();
    const accessKeyBuffer = Buffer.from(EKO_ACCESS_KEY, 'base64');
    const hmac = crypto.createHmac('sha256', accessKeyBuffer);
    hmac.update(timestamp);
    const signature = hmac.digest('base64');

    return {
        'developer_key': EKO_DEV_KEY,
        'secret-key-timestamp': timestamp,
        'secret-key': signature,
        'Accept': 'application/json'
    };
};

async function testApi() {
    try {
        const headers = getEkoHeaders();
        const url = `${EKO_BASE_URL}/customers/mobile_number:${EKO_INITIATOR_ID}/balance`;
        console.log('Testing URL:', url);
        
        const res = await axios.get(url, { headers });
        console.log('SUCCESS Response:', JSON.stringify(res.data, null, 2));
    } catch (e) {
        console.log('ERROR Response:', e.response?.status, e.response?.statusText);
        console.log('ERROR Body:', JSON.stringify(e.response?.data, null, 2));
    }
}

testApi();
