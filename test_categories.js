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

    return {
        'developer_key': EKO_DEV_KEY,
        'secret-key-timestamp': timestamp,
        'secret-key': signature,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
    };
};

async function test() {
    const url = `https://api.eko.in:25002/ekoicici/v3/customer/payment/bbps/categories?initiator_id=${EKO_INITIATOR_ID}`;
    
    console.log("Testing GET Categories...");
    try {
        const headers = getHeaders();
        const res = await axios.get(url, { headers });
        console.log("SUCCESS!", Object.keys(res.data));
    } catch(e) { 
        console.error("FAIL:", e.response ? e.response.status : e.message, e.response ? e.response.data : ''); 
    }
}
test();
