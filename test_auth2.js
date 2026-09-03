const crypto = require('crypto');
const axios = require('axios');

const EKO_DEV_KEY = '9a40fb2f68f06c86581737e05b58cd3e';
const EKO_ACCESS_KEY = 'd49acab3-ed93-4f44-a366-3ff6746dc58d';
const EKO_INITIATOR_ID = '6303210224';

const getHeaders = () => {
    const timestamp = Date.now().toString();
    const encodedKey = Buffer.from(EKO_ACCESS_KEY).toString('base64');
    const hmac = crypto.createHmac('sha256', encodedKey);
    hmac.update(timestamp);
    const signature = hmac.digest('base64');

    let headers = {
        'developer_key': EKO_DEV_KEY,
        'secret-key-timestamp': timestamp,
        'secret-key': signature,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
    };

    const requestHashString = '7032709656156303210224'; // mobile+amount+user_code
    const concatenatedString = timestamp + requestHashString;
    const requestHmac = crypto.createHmac('sha256', encodedKey);
    requestHmac.update(concatenatedString);
    headers['request_hash'] = requestHmac.digest('base64');
    
    return headers;
};

async function test() {
    const url = 'https://api.eko.in:25002/ekoicici/v3/customer/payment/bbps';
    const payload = {
        initiator_id: EKO_INITIATOR_ID,
        phone_operator_code: '52',
        utility_acc_no: '7032709656',
        confirmation_mobile_no: '7032709656',
        sender_name: 'Customer',
        category: 5,
        amount: '15',
        utilitycustomername: 'Customer',
        client_ref_id: 'req_' + Date.now(),
        source_ip: '1.1.1.1'
    };

    console.log("Testing POST with Eko Support Signature...");
    try {
        const headers = getHeaders();
        const res = await axios.post(url, payload, { headers });
        console.log("SUCCESS!", res.data);
    } catch(e) { console.error("FAIL:", e.response ? e.response.status : e.message, e.response ? e.response.data : ''); }
}
test();
