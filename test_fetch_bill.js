const axios = require('axios');
const crypto = require('crypto');

const EKO_DEV_KEY = '9a40fb2f68f06c86581737e05b58cd3e';
const EKO_ACCESS_KEY = 'd49acab3-ed93-4f44-a366-3ff6746dc58d';
const EKO_INITIATOR_ID = '6303210224';

const getHeaders = () => {
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

async function testFetchBill() {
    try {
        const url = `https://api.eko.in:25002/ekoicici/v3/customer/payment/bbps/operator/19/parameters?initiator_id=${EKO_INITIATOR_ID}`;
        console.log("Fetching params...");
        const response = await axios.get(url, { headers: getHeaders() });
        console.log("Response:", JSON.stringify(response.data.data.param_attributes, null, 2));
    } catch(e) {
        console.error("FAIL:", e.response ? e.response.status : e.message, e.response ? e.response.data : '');
    }
}
testFetchBill();
