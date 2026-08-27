const crypto = require('crypto');
const axios = require('axios');

const EKO_DEV_KEY = '9a40fb2f68f06c86581737e05b58cd3e';
const EKO_ACCESS_KEY = 'd49acab3-ed93-4f44-a366-3ff6746dc58d';
const EKO_INITIATOR_ID = '6303210224';
const EKO_BASE_URL = 'https://api.eko.in:25002/ekoicici/v3';

const getEkoHeaders = () => {
    const timestamp = Date.now().toString();
    const encodedKey = Buffer.from(EKO_ACCESS_KEY).toString('base64');
    const hmac = crypto.createHmac('sha256', encodedKey);
    hmac.update(timestamp);
    const signature = hmac.digest('base64');

    return {
        'developer_key': EKO_DEV_KEY,
        'secret-key-timestamp': timestamp,
        'secret-key': signature,
        'Accept': 'application/json'
    };
};

async function testRechargePlans() {
    const mobile = '9876543210'; // Replace with a valid test number or mock number
    
    console.log("=== TEST 1: Get Operator Code and Circle ===");
    let phone_operator_code, circleid;
    try {
        const headers = getEkoHeaders();
        const url = `${EKO_BASE_URL}/customer/payment/bbps/recharge/${mobile}/operator?initiator_id=${EKO_INITIATOR_ID}`;
        const res = await axios.get(url, { headers });
        console.log("Status:", res.data.status);
        console.log("Response:", JSON.stringify(res.data).substring(0, 300));
        
        if (res.data.dependent_params) {
            res.data.dependent_params.forEach(param => {
                if (param.name === 'phone_operator_code') phone_operator_code = param.value;
                if (param.name === 'circle_area') circleid = param.value;
            });
            console.log("Operator Code:", phone_operator_code);
            console.log("Circle ID:", circleid);
        }
    } catch (e) {
        console.log("ERROR:", e.response?.status, JSON.stringify(e.response?.data).substring(0, 200));
    }

    if (phone_operator_code && circleid) {
        console.log("\n=== TEST 2: Fetch Plans ===");
        try {
            const headers = getEkoHeaders();
            const url = `${EKO_BASE_URL}/customer/payment/bbps/recharge/${mobile}/operator/plans?initiator_id=${EKO_INITIATOR_ID}&phone_operator_code=${phone_operator_code}&circleid=${circleid}`;
            const res = await axios.get(url, { headers });
            console.log("Status:", res.data.status);
            if (res.data.dependent_params) {
                const reqList = res.data.dependent_params.find(p => p.name === 'req_list');
                console.log("Plans found:", reqList?.value?.length || 0);
                if (reqList?.value?.length > 0) {
                    console.log("First 2 plans:", JSON.stringify(reqList.value.slice(0, 2), null, 2));
                }
            }
        } catch (e) {
            console.log("ERROR:", e.response?.status, JSON.stringify(e.response?.data).substring(0, 200));
        }
    }
}
testRechargePlans();
