const axios = require('axios');
const crypto = require('crypto');
require('dotenv').config();

const EKO_DEV_KEY = process.env.EKO_DEV_KEY;
const EKO_ACCESS_KEY = process.env.EKO_ACCESS_KEY;
const EKO_INITIATOR_ID = process.env.EKO_INITIATOR_ID;

const timestamp = Date.now().toString();
const accessKeyBuffer = Buffer.from(EKO_ACCESS_KEY, 'base64');
const hmac = crypto.createHmac('sha256', accessKeyBuffer);
hmac.update(timestamp);
const signature = hmac.digest('base64');

const headers = {
    'developer_key': EKO_DEV_KEY,
    'secret-key-timestamp': timestamp,
    'secret-key': signature,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
};

async function test(userCode, serviceCode) {
    const url = `https://api.eko.in:25002/ekoicici/v3/admin/network/agent/${userCode}/service/${serviceCode}/activate`;
    const data = {
        initiator_id: EKO_INITIATOR_ID,
        client_ref_id: 'ACT_' + Date.now() + Math.floor(Math.random()*1000)
    };
    try {
        let res = await axios.put(url, data, { headers });
        console.log(`User: ${userCode}, Service: ${serviceCode} => SUCCESS:`, res.data);
    } catch (e) {
        console.log(`User: ${userCode}, Service: ${serviceCode} => ERROR:`, e.response ? e.response.data : e.message);
    }
}

async function run() {
    await test('42290001', '45');
    await test('42290001', '43');
    await test('6303210224', '45');
    await test('6303210224', '43');
    await test('42290001', '53');
    await test('6303210224', '53');
}
run();
