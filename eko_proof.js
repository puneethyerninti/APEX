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
    // Using exactly what Eko specified: Base URL + endpoint
    const url = `https://api.eko.in:25002/ekoicici/v3/admin/network/agent/${USER_CODE}/service/${SERVICE_CODE}/activate`;
    
    console.log("==========================================");
    console.log("EKO API ACTIVATION PROOF LOG");
    console.log("==========================================\n");
    
    console.log("1. TARGET URL:");
    console.log(`PUT ${url}\n`);
    
    const headers = getEkoHeaders();
    console.log("2. REQUEST HEADERS:");
    console.log(JSON.stringify(headers, null, 2) + "\n");
    
    const payload = {
        initiator_id: EKO_INITIATOR_ID,
        client_ref_id: 'ACT_' + Date.now()
    };
    
    console.log("3. REQUEST BODY:");
    console.log(JSON.stringify(payload, null, 2) + "\n");
    
    console.log("4. EXECUTING REQUEST...\n");
    
    try {
        const res = await axios.put(url, payload, { headers });
        console.log("5. SUCCESS RESPONSE FROM EKO:");
        console.log(JSON.stringify(res.data, null, 2));
    } catch (e) {
        console.log("5. ERROR RESPONSE FROM EKO SERVER:");
        console.log(`HTTP Status: ${e.response?.status}`);
        console.log("Response Body:");
        console.log(JSON.stringify(e.response?.data, null, 2));
    }
    console.log("\n==========================================");
}

runProof();
