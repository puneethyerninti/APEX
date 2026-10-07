const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const User = require('../dist/models/User').default;
const WalletTransfer = require('../dist/models/WalletTransfer').default;
const Profile = require('../dist/models/MatrimonyProfile').default;
const Transaction = require('../dist/models/Transaction').default;
const finance = require('../dist/controllers/financeController');
const matri = require('../dist/controllers/matrimonyController');
const policy = require('../dist/services/matrimonyPolicy');
const restores = [];
function stub(object, key, value) { const original = object[key]; object[key] = value; restores.push(() => object[key] = original); }
afterEach(() => { while (restores.length) restores.pop()(); });
const a = '000000000000000000000001', b = '000000000000000000000002', c = '000000000000000000000003';
function response() { return { code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } }; }
function request(body = {}) { return { user: { id: a }, body, params: {}, app: { get() {} } }; }
test('chat rooms reject a non-participant, duplicates and unsorted IDs', () => {
  assert.deepEqual(policy.roomParticipants('match_' + a + '_' + b, a), [a,b]);
  for (const room of ['match_' + a + '_' + b, 'match_' + a + '_' + a, 'match_' + b + '_' + a, 'public']) assert.throws(() => policy.roomParticipants(room, c));
  assert.throws(() => policy.roomParticipants('match_' + b + '_' + a, a));
});
test('membership requires approval and an unexpired paid subscription', () => {
  const p = { status: 'approved', subscription: { isActive: true, expiresAt: new Date(Date.now() + 60000) } };
  assert.equal(!!policy.activeMembership(p), true);
  assert.equal(!!policy.activeMembership({ ...p, status: 'pending' }), false);
  assert.equal(!!policy.activeMembership({ ...p, subscription: { isActive: true } }), false);
  assert.equal(!!policy.activeMembership({ ...p, subscription: { isActive: true, expiresAt: new Date(0) } }), false);
  assert.equal(policy.normalizePlan('Matrimony Diamond Plan'), 'Diamond');
  assert.equal(policy.normalizePlan('constructor'), '');
});
test('profile validation does not fabricate default adult details', async () => {
  stub(Profile, 'findOneAndUpdate', () => { throw new Error('must not save'); });
  for (const body of [{}, { age: 17 }, { age: 25, religion: 'Hindu', profession: '', location: 'Vizag' }]) {
    const res = response(); await matri.createProfile(request(body), res); assert.equal(res.code, 400);
  }
});
test('chat authorization rejects expired membership despite two approved profiles', async () => {
  stub(Profile, 'find', async () => [{ user: a, status: 'approved', subscription: { isActive: true, expiresAt: new Date(0) } }, { user: b }]);
  await assert.rejects(policy.authorizeChat(a, 'match_' + a + '_' + b), /membership/);
});
test('unapproved profile cannot create a paid membership order', async () => {
  process.env.RAZORPAY_KEY_ID = 'test'; process.env.RAZORPAY_KEY_SECRET = 'test';
  stub(User, 'findById', async () => ({ _id: a }));
  stub(Profile, 'findOne', async () => null);
  const res = response(); await finance.createRazorpayOrder(request({ amount: 5000, category: 'matrimony', metadata: { plan: 'Silver' } }), res);
  assert.equal(res.code, 409);
});
test('standard Razorpay cannot debit an external wallet payout', async () => {
  stub(User, 'findOneAndUpdate', () => { throw new Error('must not debit'); });
  const res = response(); await finance.withdrawToBank(request({ amount: 100, destination: 'someone@bank' }), res);
  assert.equal(res.code, 503); assert.equal(res.body.success, false);
});
test('transfer amount and references are validated before a database transaction', async () => {
  stub(mongoose, 'startSession', () => { throw new Error('must not start'); });
  for (const amount of [0, -1, 1.001, 'NaN', 100001]) {
    const res = response(); await finance.transferMoney(request({ amount, recipientPhone: '9000000000', idempotencyKey: 'test-reference-123456' }), res);
    assert.equal(res.code, 400);
  }
});
test('duplicate transfer returns stored result without debiting or exposing recipient balance', async () => {
  const session = { async withTransaction(fn) { await fn(); }, async endSession() {} };
  stub(mongoose, 'startSession', async () => session);
  stub(WalletTransfer, 'findOne', async () => ({ amount: 10, recipientPhone: '9000000000', note: '', result: { success: true, transaction: { _id: 'saved' }, recipientBalance: 500 } }));
  stub(User, 'findOneAndUpdate', () => { throw new Error('must not debit'); });
  const res = response(); await finance.transferMoney(request({ amount: 10, recipientPhone: '9000000000', idempotencyKey: 'test-reference-123456' }), res);
  assert.equal(res.code, 200); assert.equal(res.body.transaction._id, 'saved'); assert.equal(res.body.recipientBalance, undefined);
});
test('reusing a transfer reference for another amount is rejected', async () => {
  stub(mongoose, 'startSession', async () => ({ async withTransaction(fn) { await fn(); }, async endSession() {} }));
  stub(WalletTransfer, 'findOne', async () => ({ amount: 20, recipientPhone: '9000000000', note: '' }));
  const res = response(); await finance.transferMoney(request({ amount: 10, recipientPhone: '9000000000', idempotencyKey: 'test-reference-123456' }), res);
  assert.equal(res.code, 409);
});
test('new wallet transfers cannot start a session, debit, credit or create ledger records', async () => {
  stub(mongoose, 'startSession', () => { throw new Error('must not start'); });
  stub(WalletTransfer, 'findOne', async query => { assert.equal(query.user, a); return null; });
  for (const [model, method] of [[User, 'findOneAndUpdate'], [User, 'findByIdAndUpdate'], [WalletTransfer, 'create'], [Transaction, 'create']]) stub(model, method, () => { throw new Error('must not write'); });
  const res = response();
  await finance.transferMoney(request({ amount: 10, recipientPhone: '9000000000', idempotencyKey: 'test-reference-123456' }), res);
  assert.equal(res.code, 409); assert.equal(res.body.code, 'WALLET_TRANSFERS_PAUSED');
});
test('membership fulfillment needs a real matching captured payment', async () => {
  await assert.rejects(matri.handleMatrimonyUpgrade(a, 'Gold'), /captured/);
  await assert.rejects(matri.handleMatrimonyUpgrade(a, 'Gold', {}, { status: 'completed', category: 'matrimony', amount: 1 }), /captured/);
});
test('stored fulfilled membership is replayed without extending its expiry', async () => {
  stub(mongoose, 'startSession', async () => ({ async withTransaction(fn) { await fn(); }, async endSession() {} }));
  const tx = { _id: 'tx', user: a, status: 'completed', category: 'matrimony', amount: 5000, metadata: { plan: 'Silver', fulfilled: true, fulfillmentResult: { plan: 'Silver' } } };
  stub(Transaction, 'findById', () => ({ session: async () => tx }));
  stub(Profile, 'findOne', () => { throw new Error('must not extend'); });
  assert.deepEqual(await matri.handleMatrimonyUpgrade(a, 'Silver', {}, tx), { plan: 'Silver' });
});
