const crypto = require('crypto');
const axios = require('axios');

const EKO_DEV_KEY = '9a40fb2f68f06c86581737e05b58cd3e';
const EKO_ACCESS_KEY = 'd49acab3-ed93-4f44-a366-3ff6746dc58d';
const EKO_INITIATOR_ID = '6303210224';

const getEkoHeaders = () => {
    const timestamp = Date.now().toString();
    const encodedKey = Buffer.from(EKO_ACCESS_KEY).toString('base64');
    const accessKeyBuffer = Buffer.from(encodedKey, 'base64');
    const hmac = crypto.createHmac('sha256', accessKeyBuffer);
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

async function runProof() {
    const USER_CODE = '42290001';
    const SERVICE_CODE = '53';
    const url = `https://api.eko.in:25002/ekoicici/v3/admin/network/agent/${USER_CODE}/service/${SERVICE_CODE}/activate`;
    
    const headers = getEkoHeaders();
    
    // EXACTLY AS THE DOCS SAY: ONLY initiator_id in the body
    const payload = {
        initiator_id: EKO_INITIATOR_ID
    };
    
    console.log(`PUT ${url}`);
    console.log(`Payload: ${JSON.stringify(payload)}`);
    
    try {
        const res = await axios.put(url, payload, { headers });
        console.log("SUCCESS:", JSON.stringify(res.data, null, 2));
    } catch (e) {
        console.log("ERROR STATUS:", e.response?.status);
        console.log("ERROR DATA:", JSON.stringify(e.response?.data, null, 2));
    }
}
runProof();
