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

async function testFetchElectricityBill() {
    console.log("=== TEST Electricity Bill Fetch ===");
    try {
        const headers = getEkoHeaders();
        // E.g., APEPDCL or similar operator code. Let's list some operators first.
        // I will just use a generic call and see if it fails due to auth or params.
        
        // 1. Fetch electricity operators
        const catRes = await axios.get(`${EKO_BASE_URL}/customer/payment/bbps/operators?initiator_id=${EKO_INITIATOR_ID}&category=1`, { headers });
        const operators = catRes.data.param_attributes?.list_elements || [];
        if (operators.length === 0) {
            console.log("No operators found");
            return;
        }
        console.log("Found", operators.length, "operators. Trying", operators[0].name, "(ID:", operators[0].operator_id, ")");
        
        // 2. Fetch operator parameters
        const paramRes = await axios.get(`${EKO_BASE_URL}/customer/payment/bbps/operator/${operators[0].operator_id}/parameters?initiator_id=${EKO_INITIATOR_ID}`, { headers });
        console.log("Params:", paramRes.data.param_attributes?.list_elements);
        
        const params = paramRes.data.param_attributes?.list_elements || [];
        const paramName = params[0]?.param_name;

        // 3. Fetch bill
        const queryParams = new URLSearchParams({
            initiator_id: EKO_INITIATOR_ID,
            phone_operator_code: operators[0].operator_id,
            client_ref_id: "test_" + Date.now(),
            [paramName]: "123456789" // dummy consumer number
        });
        
        const url = `${EKO_BASE_URL}/customer/payment/bbps/bill?${queryParams.toString()}`;
        console.log("Fetching bill url:", url);
        const res = await axios.get(url, { headers });
        console.log("Bill Status:", res.data.status);
        console.log("Bill Response:", JSON.stringify(res.data).substring(0, 300));
    } catch (e) {
        console.log("ERROR:", e.response?.status, JSON.stringify(e.response?.data).substring(0, 200));
    }
}
testFetchElectricityBill();
