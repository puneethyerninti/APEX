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

async function testAuth() {
    console.log('\n--- 1. Testing API Authentication (Balance API) ---');
    const initId = process.env.EKO_INITIATOR_ID;
    const url = `https://api.eko.in:25002/ekoicici/v1/customers/mobile_number:${initId}/balance?initiator_id=${initId}`;
    
    try {
        const res = await axios.get(url, { headers: getEkoHeaders() });
        if (res.data.status === 0) {
            console.log('✅ Authentication SUCCESS! Keys are valid.');
            console.log(`✅ Current Balance: ₹${res.data.data.balance}`);
        } else {
            console.log('❌ Unexpected Response:', res.data);
        }
    } catch (e) {
        console.log('❌ Auth Test FAILED:', e.response?.status, e.response?.data);
    }
}

async function testBBPS() {
    console.log('\n--- 2. Testing BBPS Services (Operator Fetch API) ---');
    const mobile = '6303210224'; // Using your test number
    const initId = process.env.EKO_INITIATOR_ID;
    
    // Testing the actual BBPS endpoint that requires Service Code 53 activation
    const url = `https://api.eko.in:25002/ekoicici/v1/customer/payment/bbps/recharge/${mobile}/operator?initiator_id=${initId}&user_code=${initId}`;
    
    try {
        const res = await axios.get(url, { headers: getEkoHeaders() });
        console.log('✅ BBPS TEST SUCCESS:', res.data);
    } catch (e) {
        if (e.response?.status === 401) {
            console.log('❌ BBPS TEST BLOCKED (401 Unauthorized)');
            console.log('💡 This confirms that Eko API is blocking BBPS access. You need to email them to activate Service Code 53 on your live key.');
        } else {
            console.log('❌ BBPS TEST FAILED:', e.response?.status, e.response?.data);
        }
    }
}

async function runTests() {
    console.log('Starting Eko LIVE Environment Tests...');
    console.log(`Developer Key: ${process.env.EKO_DEV_KEY}`);
    console.log(`Initiator ID: ${process.env.EKO_INITIATOR_ID}`);
    
    await testAuth();
    await testBBPS();
    
    console.log('\n--- Tests Complete ---');
}

runTests();
