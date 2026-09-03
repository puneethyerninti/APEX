const crypto = require('crypto');
const axios = require('axios');

const EKO_DEV_KEY = '9a40fb2f68f06c86581737e05b58cd3e';
const EKO_ACCESS_KEY = 'd49acab3-ed93-4f44-a366-3ff6746dc58d';
const EKO_INITIATOR_ID = '6303210224';

const getHeaders = (hashString) => {
    const timestamp = Date.now().toString();
    const encodedKey = Buffer.from(EKO_ACCESS_KEY).toString('base64');
    const hmac = crypto.createHmac('sha256', encodedKey);
    hmac.update(timestamp);
    const signature = hmac.digest('base64');

    const headers = {
        'developer_key': EKO_DEV_KEY,
        'secret-key-timestamp': timestamp,
        'secret-key': signature,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
    };

    if (hashString) {
        const hashPayload = timestamp + hashString;
        const reqHmac = crypto.createHmac('sha256', encodedKey);
        reqHmac.update(hashPayload);
        headers['request_hash'] = reqHmac.digest('base64');
    }
    return headers;
};

async function testRecharge() {
    // Simulated params that frontend sends
    const mobile = "6303210224";
    const amount = 10;
    const operatorCode = "1"; // Airtel

    const clientRefId = `req_${Date.now()}`;
    const hashStr = `${mobile}${amount}${EKO_INITIATOR_ID}`;
    const headers = getHeaders(hashStr);

    const payload = {
        initiator_id: EKO_INITIATOR_ID,
        phone_operator_code: operatorCode,
        utility_acc_no: mobile,
        confirmation_mobile_no: mobile,
        sender_name: 'Customer',
        category: 5,
        amount: amount,
        utilitycustomername: 'Customer',
        client_ref_id: clientRefId,
        source_ip: '1.1.1.1'
    };

    console.log("Payload:", payload);
    console.log("Headers:", headers);

    try {
        const res = await axios.post(`https://api.eko.in:25002/ekoicici/v3/customer/payment/bbps`, payload, { headers });
        console.log("SUCCESS:", JSON.stringify(res.data, null, 2));
    } catch(e) {
        console.error("FAIL:", e.response ? e.response.status : e.message, e.response ? JSON.stringify(e.response.data, null, 2) : '');
    }
}
testRecharge();
