import crypto from 'crypto';
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const EKO_DEV_KEY = '9a40fb2f68f06c86581737e05b58cd3e';
const EKO_ACCESS_KEY = 'd49acab3-ed93-4f44-a366-3ff6746dc58d';
const EKO_INITIATOR_ID = '6303210224';
const EKO_BASE_URL = 'https://api.eko.in:25002/ekoicici';

export const getEkoHeaders = () => {
    const timestamp = Date.now().toString();
    const accessKeyBuffer = Buffer.from(EKO_ACCESS_KEY, 'base64');
    const hmac = crypto.createHmac('sha256', accessKeyBuffer);
    hmac.update(timestamp);
    const signature = hmac.digest('base64');

    return {
        'developer_key': EKO_DEV_KEY,
        'secret-key-timestamp': timestamp,
        'secret-key': signature,
        'Accept': 'application/json'
    };
};

async function run() {
    const headers = getEkoHeaders();
    const serviceCode = "53";
    const USER_CODE = '6303210224'; // Using mobile number
    
    console.log("\n=== TEST C: URL with USER_CODE = 6303210224 ===");
    const urlA = `${EKO_BASE_URL}/v3/admin/network/agent/${USER_CODE}/service/${serviceCode}/activate`;
    const payloadA = { initiator_id: EKO_INITIATOR_ID, client_ref_id: 'ACT_' + Date.now() };
    try {
        const resA = await axios.put(urlA, payloadA, { headers });
        console.log(resA.data);
    } catch (e: any) {
        console.log("Error C:", e.response?.data || e.message);
    }
}

run();
