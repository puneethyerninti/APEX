const crypto = require("crypto");
const axios = require("axios");

const EKO_DEV_KEY = "9a40fb2f68f06c86581737e05b58cd3e";
const EKO_ACCESS_KEY = "d49acab3-ed93-4f44-a366-3ff6746dc58d";
const EKO_INITIATOR_ID = "6303210224";
const EKO_BASE_URL = "https://api.eko.in:25002/ekoicici/v3";

const getEkoHeaders = () => {
    const timestamp = Date.now().toString();
    const encodedKey = Buffer.from(EKO_ACCESS_KEY).toString("base64");
    const hmac = crypto.createHmac("sha256", encodedKey);
    hmac.update(timestamp);
    const signature = hmac.digest("base64");

    return {
        "developer_key": EKO_DEV_KEY,
        "secret-key-timestamp": timestamp,
        "secret-key": signature,
        "Accept": "application/json"
    };
};

async function testDthPlans() {
    const mobile = "1234567890"; // Fake ID
    console.log("=== TEST DTH Plans ===");
    try {
        const headers = getEkoHeaders();
        // 29 is Airtel DTH for example, circleid might not be needed or maybe 18
        const url = `${EKO_BASE_URL}/customer/payment/bbps/recharge/${mobile}/operator/plans?initiator_id=${EKO_INITIATOR_ID}&phone_operator_code=29`;
        const res = await axios.get(url, { headers });
        console.log("Status:", res.data.status);
        console.log("Response:", JSON.stringify(res.data).substring(0, 300));
    } catch (e) {
        console.log("ERROR:", e.response?.status, JSON.stringify(e.response?.data).substring(0, 200));
    }
}
testDthPlans();
