import crypto from 'crypto';
import axios from 'axios';

const EKO_DEV_KEY = '9a40fb2f68f06c86581737e05b58cd3e';
const EKO_ACCESS_KEY = 'd49acab3-ed93-4f44-a366-3ff6746dc58d';
const EKO_INITIATOR_ID = '6303210224';

const getEkoHeaders = (requestHashString?: string) => {
    const timestamp = Date.now().toString();
    const encodedKey = Buffer.from(EKO_ACCESS_KEY).toString('base64');
    const accessKeyBuffer = Buffer.from(encodedKey, 'base64');
    const hmac = crypto.createHmac('sha256', accessKeyBuffer);
    hmac.update(timestamp);
    const signature = hmac.digest('base64');

    const headers: any = {
        'developer_key': EKO_DEV_KEY,
        'secret-key-timestamp': timestamp,
        'secret-key': signature,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
    };

    if (requestHashString) {
        const concatenatedString = timestamp + requestHashString;
        const requestHmac = crypto.createHmac('sha256', accessKeyBuffer);
        requestHmac.update(concatenatedString);
        headers['request_hash'] = requestHmac.digest('base64');
    }

    return headers;
};

async function run() {
    const EKO_BASE = 'https://api.eko.in:25002/ekoicici';
    
    console.log("\n=== TEST: Mock BBPS Payment ===");
    try {
        const mobile = "9999999999";
        const amount = 10;
        const USER_CODE = '42290001';
        
        // Sequence: secret_key_timestamp + utility_acc_no + amount + user_code
        const requestHashString = `${mobile}${amount}${USER_CODE}`;
        const headers = getEkoHeaders(requestHashString);
        
        const url = `${EKO_BASE}/v1/customer/payment/bbps`; // Changed to v1 just in case
        
        const payload = {
            initiator_id: EKO_INITIATOR_ID,
            phone_operator_code: "123", // fake
            utility_acc_no: mobile,
            confirmation_mobile_no: mobile,
            sender_name: "Customer",
            amount: amount,
            client_ref_id: 'REF_' + Date.now(),
            source_ip: "127.0.0.1"
        };
        
        const res = await axios.post(url, payload, { headers });
        console.log("Response:", JSON.stringify(res.data));
    } catch (e: any) {
        console.log("Error:", JSON.stringify(e.response?.data || e.message));
    }
}

run();
