require('dotenv').config();
const crypto = require('crypto');
const axios = require('axios');

const EKO_DEV_KEY = '9a40fb2f68f06c86581737e05b58cd3e';
const EKO_ACCESS_KEY = 'd49acab3-ed93-4f44-a366-3ff6746dc58d';
const EKO_INITIATOR_ID = '6303210224';

const getEkoHeaders = () => {
    const encodedKey = EKO_ACCESS_KEY;
    const timestamp = Date.now().toString();
    const concatenatedStringKey = EKO_ACCESS_KEY + ':' + timestamp;
    const hmac = crypto.createHmac('sha256', encodedKey);
    hmac.update(concatenatedStringKey);
    const signature = hmac.digest('base64');

    let headers = {
        'developer_key': EKO_DEV_KEY,
        'secret-key-timestamp': timestamp,
        'secret-key': signature,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
    };
    return headers;
};

async function testRecharge() {
    const mobile = '7032709656';
    const amount = '15';
    const clientRefId = 'req_' + Date.now();
    
    const headers = getEkoHeaders();
    
    const url = 'https://api.eko.in:25002/ekoicici/v3/customer/payment/bbps';
    const payload = {
        initiator_id: EKO_INITIATOR_ID,
        phone_operator_code: '52', // 52 = Airtel, 49 = Jio. Using 49.
        utility_acc_no: mobile,
        confirmation_mobile_no: mobile,
        sender_name: 'Customer',
        category: 5,
        amount: amount,
        utilitycustomername: 'Customer',
        client_ref_id: clientRefId,
        source_ip: '1.1.1.1'
    };

    console.log("Headers:", headers);
    console.log("Payload:", payload);

    try {
        const response = await axios.post(url, payload, { headers });
        console.log("Success:", JSON.stringify(response.data, null, 2));
    } catch (e) {
        console.error("Error:", JSON.stringify(e.response ? e.response.data : e.message, null, 2));
    }
}
testRecharge();
