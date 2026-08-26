import crypto from 'crypto';
import axios from 'axios';

const EKO_DEV_KEY = '9a40fb2f68f06c86581737e05b58cd3e';
const EKO_ACCESS_KEY = 'd49acab3-ed93-4f44-a366-3ff6746dc58d';
const EKO_INITIATOR_ID = '6303210224';
const USER_CODE = '42290001';

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

async function run() {
    const EKO_BASE = 'https://api.eko.in:25002/ekoicici';
    const headers = getEkoHeaders();
    
    // Test different service codes to see if ANY of them are allowed
    const serviceCodesToTest = ["53", "4", "39", "63", "58"];

    for (const code of serviceCodesToTest) {
        console.log(`\n=== TEST: Activating Service Code ${code} ===`);
        try {
            const url = `${EKO_BASE}/v3/admin/network/agent/${USER_CODE}/service/${code}/activate`;
            const payload = { initiator_id: EKO_INITIATOR_ID, client_ref_id: 'ACT_' + Date.now() + "_" + code };
            const res = await axios.put(url, payload, { headers });
            console.log(`Code ${code} Response:`, JSON.stringify(res.data));
        } catch (e: any) {
            console.log(`Code ${code} Error:`, JSON.stringify(e.response?.data || e.message));
        }
    }
}

run();
