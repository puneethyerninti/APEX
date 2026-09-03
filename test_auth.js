const crypto = require('crypto');
const axios = require('axios');

const EKO_DEV_KEY = '9a40fb2f68f06c86581737e05b58cd3e';
const EKO_ACCESS_KEY = 'd49acab3-ed93-4f44-a366-3ff6746dc58d';
const EKO_INITIATOR_ID = '6303210224';

const getHeaders = (decodeBase64) => {
    const key = decodeBase64 ? Buffer.from(EKO_ACCESS_KEY, 'base64') : EKO_ACCESS_KEY;
    const timestamp = Date.now().toString();
    const concatenatedStringKey = EKO_ACCESS_KEY + ':' + timestamp;
    const hmac = crypto.createHmac('sha256', key);
    hmac.update(concatenatedStringKey);
    const signature = hmac.digest('base64');

    return {
        'developer_key': EKO_DEV_KEY,
        'secret-key-timestamp': timestamp,
        'secret-key': signature,
        'Accept': 'application/json'
    };
};

async function test() {
    console.log("Testing WITH Base64 Decode...");
    try {
        const h1 = getHeaders(true);
        const res1 = await axios.get(`https://api.eko.in:25002/ekoicici/v1/customers/mobile_number:${EKO_INITIATOR_ID}/balance?initiator_id=${EKO_INITIATOR_ID}`, { headers: h1 });
        console.log("SUCCESS WITH BASE64!", res1.data);
    } catch(e) { console.error("FAIL WITH BASE64:", e.response ? e.response.status : e.message); }

    console.log("Testing WITHOUT Base64 Decode...");
    try {
        const h2 = getHeaders(false);
        const res2 = await axios.get(`https://api.eko.in:25002/ekoicici/v1/customers/mobile_number:${EKO_INITIATOR_ID}/balance?initiator_id=${EKO_INITIATOR_ID}`, { headers: h2 });
        console.log("SUCCESS WITHOUT BASE64!", res2.data);
    } catch(e) { console.error("FAIL WITHOUT BASE64:", e.response ? e.response.status : e.message); }
}
test();
