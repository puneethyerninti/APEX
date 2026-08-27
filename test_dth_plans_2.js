const crypto = require("crypto");
const axios = require("axios");
const EKO_BASE_URL = "https://api.eko.in:25002/ekoicici/v3";
const getEkoHeaders = () => {
    const timestamp = Date.now().toString();
    const hmac = crypto.createHmac("sha256", Buffer.from("d49acab3-ed93-4f44-a366-3ff6746dc58d").toString("base64"));
    hmac.update(timestamp);
    return {
        "developer_key": "9a40fb2f68f06c86581737e05b58cd3e",
        "secret-key-timestamp": timestamp,
        "secret-key": hmac.digest("base64"),
        "Accept": "application/json"
    };
};
async function testDthPlans() {
    try {
        const url = `${EKO_BASE_URL}/customer/payment/bbps/recharge/1234567890/operator/plans?initiator_id=6303210224&phone_operator_code=29&circleid=18`;
        const res = await axios.get(url, { headers: getEkoHeaders() });
        console.log("Status:", res.data.status);
        console.log("Response:", JSON.stringify(res.data).substring(0, 300));
    } catch (e) { console.log("ERROR:", e.response?.data); }
}
testDthPlans();
