require('dotenv').config({ path: './.env' });
const crypto = require('crypto');
const axios = require('axios');

const getEkoHeaders = () => {
    const timestamp = Date.now().toString();
    const accessKeyBuffer = Buffer.from(process.env.EKO_ACCESS_KEY, 'base64');
    const hmac = crypto.createHmac('sha256', accessKeyBuffer);
    hmac.update(timestamp);
    const signature = hmac.digest('base64');

    return {
        'developer_key': process.env.EKO_DEV_KEY,
        'secret-key-timestamp': timestamp,
        'secret-key': signature,
        'Accept': 'application/json'
    };
};

async function testUrl(url) {
    try {
        console.log('Testing:', url);
        const res = await axios.get(url, { headers: getEkoHeaders() });
        console.log('STATUS:', res.status, res.data.message || 'Success');
    } catch (e) {
        console.log('FAILED:', e.response?.status, JSON.stringify(e.response?.data));
    }
}

async function run() {
    const initId = process.env.EKO_INITIATOR_ID;
    const urls = [
        `https://api.eko.in:25002/ekoicici/v1/banks?initiator_id=${initId}`
    ];
    for (let u of urls) {
        await testUrl(u);
    }
}

run();
