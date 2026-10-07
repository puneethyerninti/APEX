const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const User = require('../dist/models/User').default;
const Transaction = require('../dist/models/Transaction').default;
const WalletTransfer = require('../dist/models/WalletTransfer').default;
const finance = require('../dist/controllers/financeController');
const undo = [];
function stub(model, method, value) { const old = model[method]; model[method] = value; undo.push(() => model[method] = old); }
afterEach(() => { while (undo.length) undo.pop()(); });
const id = '000000000000000000000001';
const req = body => ({ user: { id }, body, app: { get() {} } });
const res = () => ({ code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } });

test('new deposits and missing service category are rejected before provider or database access', async () => {
  stub(User, 'findById', () => { throw new Error('must not query'); });
  stub(Transaction, 'create', () => { throw new Error('must not create'); });
  for (const category of ['add_money', 'wallet_recharge', undefined]) {
    const response = res(); await finance.createRazorpayOrder(req({ amount: 51, category }), response);
    assert.equal(response.code, category ? 409 : 400);
    assert.equal(response.body.order, undefined);
  }
});
test('direct old wallet endpoints cannot mutate balances or mint receive QRs', async () => {
  stub(mongoose, 'startSession', () => { throw new Error('must not start'); });
  stub(User, 'findById', () => { throw new Error('must not query'); });
  for (const handler of [finance.addMoney, finance.deductMoney, finance.getMyQrPayload]) {
    const response = res(); await handler(req({ amount: 51 }), response);
    assert.equal(response.code, 409); assert.equal(response.body.success, false);
    assert.equal(response.body.apexUri, undefined);
  }
});
test('existing balance is returned under authenticated ownership without alteration', async () => {
  stub(User, 'findById', async queried => { assert.equal(queried, id); return { _id: id, walletBalance: 51 }; });
  const response = res(); await finance.getWalletBalance(req({ userId: 'someone-else' }), response);
  assert.equal(response.code, 200); assert.equal(response.body.balance, 51);
});
test('incomplete old receipt and database outage do not invent success or disclose database errors', async () => {
  const body = { amount: 51, recipientPhone: '9000000000', idempotencyKey: 'existing-reference-123' };
  stub(WalletTransfer, 'findOne', async () => ({ amount: 51, recipientPhone: body.recipientPhone, note: '', result: null }));
  const first = res(); await finance.transferMoney(req(body), first); assert.equal(first.code, 409);
  stub(WalletTransfer, 'findOne', async () => { throw new Error('private-database-connection'); });
  const second = res(); await finance.transferMoney(req(body), second); assert.equal(second.code, 503);
  assert.doesNotMatch(second.body.error, /private-database/);
});
test('actual authenticated HTTP routes reject old funding clients without any money writes', async () => {
  const express = require('express'); const jwt = require('jsonwebtoken');
  process.env.JWT_SECRET = 'isolated-test-secret';
  const headers = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + jwt.sign({ id, authVersion: 2 }, process.env.JWT_SECRET) };
  stub(User, 'findById', () => { throw new Error('must not query for new deposit'); });
  stub(mongoose, 'startSession', () => { throw new Error('must not start'); });
  stub(WalletTransfer, 'findOne', async () => null);
  stub(Transaction, 'create', () => { throw new Error('must not create'); });
  const app = express(); app.use(express.json()); app.use('/api/finance', require('../dist/routes/financeRoutes').default);
  const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  const base = 'http://127.0.0.1:' + server.address().port + '/api/finance';
  try {
    for (const [method, url, body] of [
      ['POST', '/razorpay/order', { amount: 51, category: 'add_money' }],
      ['POST', '/razorpay/order', { amount: 51, category: 'wallet_recharge' }],
      ['POST', '/wallet/add', { amount: 51 }], ['POST', '/wallet/deduct', { amount: 51 }],
      ['POST', '/wallet/transfer', { amount: 51, recipientPhone: '9000000000', idempotencyKey: 'existing-reference-123' }],
      ['GET', '/my-qr', undefined]
    ]) {
      const denied = await fetch(base + url, { method }); assert.equal(denied.status, 401, url);
      const response = await fetch(base + url, { method, headers, ...(body ? { body: JSON.stringify(body) } : {}) });
      assert.equal(response.status, 409, url); const result = await response.json(); assert.ok(result.error); assert.equal(result.order, undefined);
    }
  } finally { await new Promise(resolve => server.close(resolve)); }
});
test('genuine APEX service checkout remains available without a wallet deposit', async () => {
  process.env.RAZORPAY_KEY_ID = 'rzp_test_fixture'; process.env.RAZORPAY_KEY_SECRET = 'isolated-test-secret';
  stub(User, 'findById', async () => ({ _id: id }));
  const provider = finance.getRazorpay(); let orders = 0;
  stub(provider.orders, 'create', async options => { orders++; assert.equal(options.amount, 5100); return { id: 'order_service', amount: 5100, currency: 'INR' }; });
  stub(Transaction, 'create', async record => { assert.equal(record.category, 'subscription'); assert.equal(record.type, 'debit'); assert.equal(record.user, id); });
  const response = res(); await finance.createRazorpayOrder(req({ amount: 51, category: 'subscription', serviceName: 'APEX membership' }), response);
  assert.equal(response.code, 200); assert.equal(orders, 1); assert.equal(response.body.order.id, 'order_service');
});
