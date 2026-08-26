require('dotenv').config({ path: './.env' });
const crypto = require('crypto');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

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
        'Accept': 'application/json',
        'Content-Type': 'application/json'
    };
};

async function activateBBPS() {
    console.log('\n--- Attempting to Activate BBPS (Service 53) ---');
    const initId = process.env.EKO_INITIATOR_ID;
    const userCode = '42290001'; 
    const clientRefId = uuidv4();
    
    const url = `https://api.eko.in:25002/ekoicici/v3/admin/network/agent/${userCode}/service/53/activate`;
    
    try {
        const payload = {
            initiator_id: initId,
            client_ref_id: clientRefId
        };
        const res = await axios.put(url, payload, { headers: getEkoHeaders() });
        console.log('Activation SUCCESS:', JSON.stringify(res.data, null, 2));
    } catch (e) {
        console.log('Activation FAILED:', e.response?.status, e.response?.data);
    }
}

activateBBPS();
