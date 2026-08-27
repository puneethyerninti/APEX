const crypto = require('crypto');
const axios = require('axios');

const EKO_DEV_KEY = '9a40fb2f68f06c86581737e05b58cd3e';
const EKO_ACCESS_KEY = 'd49acab3-ed93-4f44-a366-3ff6746dc58d';
const EKO_INITIATOR_ID = '6303210224';

// Their timestamp and expected signature from the email
const THEIR_TIMESTAMP = '1787730027589';
const THEIR_SIGNATURE = '7KmEZqsTc0nPX1Wy89No7BgyemLi0/vQIwdkFDntT0M=';

console.log("=== SIGNATURE VERIFICATION ===\n");

// Method 1: Our current code (base64 encode then decode - cancels out)
const encodedKey1 = Buffer.from(EKO_ACCESS_KEY).toString('base64');
const keyBuffer1 = Buffer.from(encodedKey1, 'base64');
const hmac1 = crypto.createHmac('sha256', keyBuffer1);
hmac1.update(THEIR_TIMESTAMP);
const sig1 = hmac1.digest('base64');
console.log("Method 1 (our current code):", sig1);
console.log("Match?", sig1 === THEIR_SIGNATURE);

// Method 2: Use access key directly as UTF-8 bytes (no base64 encode/decode)
const hmac2 = crypto.createHmac('sha256', EKO_ACCESS_KEY);
hmac2.update(THEIR_TIMESTAMP);
const sig2 = hmac2.digest('base64');
console.log("\nMethod 2 (raw string key):", sig2);
console.log("Match?", sig2 === THEIR_SIGNATURE);

// Method 3: Decode access key AS IF it were base64 (it has hyphens so this might fail)
try {
    const keyBuffer3 = Buffer.from(EKO_ACCESS_KEY, 'base64');
    const hmac3 = crypto.createHmac('sha256', keyBuffer3);
    hmac3.update(THEIR_TIMESTAMP);
    const sig3 = hmac3.digest('base64');
    console.log("\nMethod 3 (decode key as base64):", sig3);
    console.log("Match?", sig3 === THEIR_SIGNATURE);
} catch(e) {
    console.log("\nMethod 3 failed:", e.message);
}

// Method 4: Use base64-encoded key directly as string key
const encodedKey4 = Buffer.from(EKO_ACCESS_KEY).toString('base64');
const hmac4 = crypto.createHmac('sha256', encodedKey4);
hmac4.update(THEIR_TIMESTAMP);
const sig4 = hmac4.digest('base64');
console.log("\nMethod 4 (base64-encoded string as key):", sig4);
console.log("Match?", sig4 === THEIR_SIGNATURE);

// Method 5: Use base64 encoded key as bytes directly (not decoded)
const encodedKey5 = Buffer.from(EKO_ACCESS_KEY).toString('base64');
const keyBuffer5 = Buffer.from(encodedKey5, 'utf8');
const hmac5 = crypto.createHmac('sha256', keyBuffer5);
hmac5.update(THEIR_TIMESTAMP);
const sig5 = hmac5.digest('base64');
console.log("\nMethod 5 (base64 string as utf8 bytes):", sig5);
console.log("Match?", sig5 === THEIR_SIGNATURE);

console.log("\n\nExpected:", THEIR_SIGNATURE);
