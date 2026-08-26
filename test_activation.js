const axios = require('axios');
const crypto = require('crypto');
require('dotenv').config();

const EKO_DEV_KEY = process.env.EKO_DEV_KEY;
const EKO_ACCESS_KEY = process.env.EKO_ACCESS_KEY;
const EKO_INITIATOR_ID = process.env.EKO_INITIATOR_ID;
const USER_CODE = EKO_INITIATOR_ID;

const timestamp = Date.now().toString();
const accessKeyBuffer = Buffer.from(EKO_ACCESS_KEY, 'base64');
const hmac = crypto.createHmac('sha256', accessKeyBuffer);
hmac.update(timestamp);
const signature = hmac.digest('base64');

// Try with application/x-www-form-urlencoded
const headers = {
    'developer_key': EKO_DEV_KEY,
    'secret-key-timestamp': timestamp,
    'secret-key': signature,
    'Content-Type': 'application/x-www-form-urlencoded',
    'Accept': 'application/json'
};

const qs = require('querystring');
const data = qs.stringify({
    initiator_id: EKO_INITIATOR_ID,
    client_ref_id: 'ACT_' + Date.now()
});

const url = `https://api.eko.in:25002/ekoicici/v3/admin/network/agent/${USER_CODE}/service/53/activate`;

axios.put(url, data, { headers })
    .then(res => console.log('SUCCESS form-urlencoded:', res.data))
    .catch(err => {
        console.log('ERROR form-urlencoded:', err.response ? err.response.data : err.message);
        
        // Try with application/json
        const headers2 = {
            'developer_key': EKO_DEV_KEY,
            'secret-key-timestamp': timestamp,
            'secret-key': signature,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
        const data2 = {
            initiator_id: EKO_INITIATOR_ID,
            client_ref_id: 'ACT_' + Date.now()
        };
        
        axios.put(url, data2, { headers: headers2 })
            .then(res2 => console.log('SUCCESS json:', res2.data))
            .catch(err2 => console.log('ERROR json:', err2.response ? err2.response.data : err2.message));
    });
