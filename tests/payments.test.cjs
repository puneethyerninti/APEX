const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const mongoose = require('mongoose');
const User = require('../dist/models/User').default;
const Transaction = require('../dist/models/Transaction').default;
const WebhookEvent = require('../dist/models/WebhookEvent').default;
const finance = require('../dist/controllers/financeController');
const { fulfillOrder } = require('../dist/services/fulfillmentService');
const { handleRazorpayWebhook } = require('../dist/controllers/webhookController');

process.env.RAZORPAY_KEY_ID = 'rzp_test_fixture';
process.env.RAZORPAY_KEY_SECRET = 'test-only-secret';
process.env.RAZORPAY_WEBHOOK_SECRET = 'test-only-webhook-secret';
const userId = new mongoose.Types.ObjectId();
const restores = [];
function stub(object, key, value) {
  const previous = object[key];
  object[key] = value;
  restores.push(() => { object[key] = previous; });
}
afterEach(() => { while (restores.length) restores.pop()(); });
function response() {
  return { code: 200, status(code) { this.code = code; return this; },
    json(body) { this.body = body; return this; }, send(body) { this.body = body; return this; } };
}
function request(body) { return { body, user: { id: userId }, headers: {}, query: {}, app: { get() {} } }; }
function verification() {
  return { razorpay_order_id: 'order_fixture', razorpay_payment_id: 'pay_fixture',
    razorpay_signature: crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update('order_fixture|pay_fixture').digest('hex') };
}
function paymentSetup(status = 'captured', amount = 10000) {
  const tx = { _id: new mongoose.Types.ObjectId(), user: userId, amount: 100,
    razorpayOrderId: 'order_fixture', razorpayPaymentId: 'pay_fixture',
    status: 'completed', category: 'add_money', metadata: { fulfilled: true, fulfillmentResult: { credited: true } } };
  stub(User, 'findById', async () => ({ _id: userId }));
  stub(Transaction, 'findOne', async query => {
    assert.equal(String(query.user), String(userId)); return tx;
  });
  stub(Transaction, 'findOneAndUpdate', async () => null);
  stub(Transaction, 'findById', async () => tx);
  stub(finance.getRazorpay().payments, 'fetch', async () => ({ order_id: 'order_fixture', status, amount, currency: 'INR' }));
  return tx;
}

test('unknown order cannot be reported as verified', async () => {
  paymentSetup(); stub(Transaction, 'findOne', async () => null);
  const res = response(); await finance.verifyRazorpayPayment(request(verification()), res);
  assert.equal(res.code, 404); assert.equal(res.body.success, false);
});
test('bad signature is rejected before payment lookup', async () => {
  paymentSetup(); stub(finance.getRazorpay().payments, 'fetch', () => { throw new Error('must not fetch'); });
  const res = response(); await finance.verifyRazorpayPayment(request({ ...verification(), razorpay_signature: 'invalid' }), res);
  assert.equal(res.code, 400);
});
test('authorized payment does not credit wallet before capture', async () => {
  paymentSetup('authorized');
  const res = response(); await finance.verifyRazorpayPayment(request(verification()), res);
  assert.equal(res.code, 409); assert.equal(res.body.status, 'payment_pending');
});
test('captured payment with wrong amount is rejected', async () => {
  paymentSetup('captured', 1);
  const res = response(); await finance.verifyRazorpayPayment(request(verification()), res);
  assert.equal(res.code, 400);
});
test('duplicate verification returns stored fulfillment without another wallet credit', async () => {
  paymentSetup(); stub(User, 'findByIdAndUpdate', () => { throw new Error('must not credit'); });
  const res = response(); await finance.verifyRazorpayPayment(request(verification()), res);
  assert.equal(res.code, 200); assert.equal(res.body.fulfillmentData.credited, true);
});
test('wallet credit and fulfillment marker share an atomic database transaction', async () => {
  let credits = 0;
  let fulfilled = false;
  const session = { async withTransaction(callback) { await callback(); }, async endSession() {} };
  stub(mongoose, 'startSession', async () => session);
  stub(Transaction, 'findOneAndUpdate', async (filter, update, options) => {
    assert.equal(filter['metadata.fulfilled'].$ne, true);
    assert.equal(filter.status, 'completed'); assert.equal(options.session, session);
    if (fulfilled) return null;
    fulfilled = true; return {};
  });
  stub(User, 'findByIdAndUpdate', async (id, update, options) => {
    assert.equal(options.session, session); credits++; return { walletBalance: update.$inc.walletBalance };
  });
  stub(Transaction, 'findByIdAndUpdate', async (id, update, options) => { assert.equal(options.session, session); });
  stub(Transaction, 'findById', () => ({ session: async () => ({ metadata: { fulfillmentResult: { credited: true } } }) }));
  const tx = { _id: 'tx', user: userId, amount: 100, status: 'completed', category: 'add_money', metadata: {} };
  await fulfillOrder(tx); await fulfillOrder(tx);
  assert.equal(credits, 1);
});
test('webhook failure permits the same event to be retried', async () => {
  let deleted = 0;
  stub(WebhookEvent, 'create', async () => ({}));
  stub(WebhookEvent, 'deleteOne', async () => { deleted++; });
  stub(Transaction, 'findOne', async () => { throw new Error('temporary database outage'); });
  const body = { event: 'payment.captured', payload: { payment: { entity: { id: 'pay_fixture', order_id: 'order_fixture' } } } };
  const rawBody = Buffer.from(JSON.stringify(body));
  const req = request(body); req.rawBody = rawBody;
  req.headers['x-razorpay-signature'] = crypto.createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET).update(rawBody).digest('hex');
  req.headers['x-razorpay-event-id'] = 'event_fixture';
  const res = response(); await handleRazorpayWebhook(req, res);
  assert.equal(res.code, 500); assert.equal(deleted, 1);
});
test('webhook rejects reconstructed JSON instead of the original signed body', async () => {
  const req = request({ event: 'payment.captured' }); req.headers['x-razorpay-signature'] = 'a'.repeat(64);
  const res = response(); await handleRazorpayWebhook(req, res); assert.equal(res.code, 400);
});
test('external merchant wallet payment never debits or invents delivery', async () => {
  const res = response(); await finance.payMerchantWithWallet(request({ amount: 100, payeeVpa: 'merchant@upi' }), res);
  assert.equal(res.code, 503); assert.equal(res.body.success, false);
});
test('withdrawal without payout account does not debit wallet', async () => {
  const previous = process.env.RAZORPAYX_ACCOUNT_NUMBER;
  delete process.env.RAZORPAYX_ACCOUNT_NUMBER;
  try {
    const res = response(); await finance.withdrawToBank(request({ amount: 100 }), res);
    assert.equal(res.code, 503); assert.equal(res.body.success, false);
  } finally { if (previous) process.env.RAZORPAYX_ACCOUNT_NUMBER = previous; }
});
