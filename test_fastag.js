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

async function testOperators() {
    try {
        console.log("Fetching FASTag parameters...");
        const dthOps = await axios.get(`https://api.eko.in:25002/ekoicici/customer/payment/bbps/category/FASTag/operators?initiator_id=${EKO_INITIATOR_ID}`, { headers: getHeaders() });
        const list = dthOps.data.data.param_attributes.list_elements;
        const op = list[0]; 
        console.log("Found Operator:", op);
        const params = await axios.get(`https://api.eko.in:25002/ekoicici/customer/payment/bbps/operator/${op.phone_operator_code}/parameters?initiator_id=${EKO_INITIATOR_ID}`, { headers: getHeaders() });
        console.log("Params:", JSON.stringify(params.data.data.param_attributes, null, 2));

        console.log("Fetching DTH parameters...");
        const dth = await axios.get(`https://api.eko.in:25002/ekoicici/customer/payment/bbps/category/DTH/operators?initiator_id=${EKO_INITIATOR_ID}`, { headers: getHeaders() });
        const dthList = dth.data.data.param_attributes.list_elements;
        const op2 = dthList[0];
        console.log("Found DTH Operator:", op2);
        const params2 = await axios.get(`https://api.eko.in:25002/ekoicici/customer/payment/bbps/operator/${op2.phone_operator_code}/parameters?initiator_id=${EKO_INITIATOR_ID}`, { headers: getHeaders() });
        console.log("Params:", JSON.stringify(params2.data.data.param_attributes, null, 2));

    } catch(e) {
        console.error("FAIL:", e.response ? e.response.status : e.message, e.response ? e.response.data : '');
    }
}
testOperators();
