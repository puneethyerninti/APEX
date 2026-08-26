require('dotenv').config({ path: './.env' });
const { getOperatorCodeAndCircle, fetchRechargePlans } = require('./dist/services/ekoService');

async function testEkoFull() {
    try {
        console.log('Testing getOperatorCodeAndCircle with 6303210224...');
        const op = await getOperatorCodeAndCircle('6303210224');
        console.log('Operator & Circle:', op);
        
        console.log('Testing fetchRechargePlans...');
        const plans = await fetchRechargePlans('6303210224', op.phone_operator_code, op.circleid);
        console.log(`Found ${plans.length} plans. First 2 plans:`);
        console.log(plans.slice(0, 2));
    } catch (e) {
        console.error('Test failed:', e);
    }
}

testEkoFull();
