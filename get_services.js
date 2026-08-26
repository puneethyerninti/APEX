const axios = require('axios');
const crypto = require('crypto');
const dotenv = require('dotenv');

dotenv.config();

const EKO_DEV_KEY = process.env.EKO_DEV_KEY;
const EKO_ACCESS_KEY = process.env.EKO_ACCESS_KEY;
const EKO_INITIATOR_ID = process.env.EKO_INITIATOR_ID;

const timestamp = Date.now().toString();
const accessKeyBuffer = Buffer.from(EKO_ACCESS_KEY, 'base64');
const hmac = crypto.createHmac('sha256', accessKeyBuffer);
hmac.update(timestamp);
const signature = hmac.digest('base64');

const headers = {
    'developer_key': EKO_DEV_KEY,
    'secret-key-timestamp': timestamp,
    'secret-key': signature,
    'Accept': 'application/json'
};

const url = `https://api.eko.in:25002/ekoicici/v3/tools/catalog/services-codes?initiator_id=${EKO_INITIATOR_ID}`;

axios.get(url, { headers })
    .then(response => {
        console.log('Success:', JSON.stringify(response.data, null, 2));
    })
    .catch(error => {
        console.error('Error:', error.response ? JSON.stringify(error.response.data, null, 2) : error.message);
    });
