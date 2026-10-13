const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const User = require('../dist/models/User').default;
const Session = require('../dist/models/AuthSession').default;
const Request = require('../dist/models/SupportRequest').default;
const Block = require('../dist/models/UserBlock').default;
const Profile = require('../dist/models/MatrimonyProfile').default;
const Course = require('../dist/models/Course').default;
const Enrollment = require('../dist/models/AcademyEnrollment').default;
const finance = require('../dist/controllers/financeController');
const academy = require('../dist/controllers/academyController');
const policy = require('../dist/services/matrimonyPolicy');
const mongoose = require('mongoose');
const Transaction = require('../dist/models/Transaction').default;
const undo = [];
function stub(model, method, fn) { const old = model[method]; model[method] = fn; undo.push(() => model[method] = old); }
afterEach(() => { while (undo.length) undo.pop()(); });
const a = '000000000000000000000001', b = '000000000000000000000002';
const response = () => ({ code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } });
test('both directions of blocking stop chat before message access', async () => {
  let query;
  stub(Block, 'exists', async q => { query = q; return { _id: 'blocked' }; });
  stub(Profile, 'find', () => { throw new Error('must not load messages or profile'); });
  await assert.rejects(policy.authorizeChat(a, 'match_' + a + '_' + b), /blocked/);
  assert.deepEqual(query.$or, [{ user: a, blocked: b }, { user: b, blocked: a }]);
});
test('missing course, missing delivery and forged subscription selection cannot open a checkout', async () => {
  process.env.RAZORPAY_KEY_ID = 'fixture'; process.env.RAZORPAY_KEY_SECRET = 'fixture';
  stub(User, 'findById', async () => ({ _id: a }));
  stub(Course, 'findOne', () => ({ select: async () => ({ price: 50 }) }));
  for (const [body, code] of [
    [{ amount: 1, category: 'academy_enrollment' }, 400],
    [{ amount: 1, category: 'academy_enrollment', metadata: { courseName: 'Missing Delivery' } }, 409],
    [{ amount: 1, category: 'subscription', metadata: { plan: 'constructor' } }, 400],
    [{ amount: 1, category: 'charity' }, 409]
  ]) { const r = response(); await finance.createRazorpayOrder({ user: { id: a }, body }, r); assert.equal(r.code, code); assert.equal(r.body.order, undefined); }
});
test('course access requires verified owner payment and duplicate fulfillment replays saved enrollment', async () => {
  stub(User, 'findById', async () => ({ _id: a }));
  await assert.rejects(academy.handleAcademyEnrollment(a, { courseName: 'Course' }, { _id: a, category: 'academy_enrollment', user: b, status: 'completed' }), /Verified/);
  stub(Enrollment, 'findOne', async () => ({ _id: 'existing-enrollment' }));
  stub(Course, 'findOne', () => { throw new Error('must not create another enrollment'); });
  assert.equal((await academy.handleAcademyEnrollment(a, { courseName: 'Course' }, { _id: a, category: 'academy_enrollment', user: a, status: 'completed' })).enrollmentId, 'existing-enrollment');
});
test('subscription replay cannot extend access twice and wrong captured price cannot grant access', async () => {
  const handler = require('../dist/controllers/userController').handleAPEXPlanUpgrade;
  await assert.rejects(handler(a, 'APEX Plus', { _id: a, status: 'completed', category: 'subscription', user: a, amount: 1 }), /captured/);
  stub(mongoose, 'startSession', async () => ({ withTransaction: async fn => fn(), endSession: async () => {} }));
  const tx = { _id: a, status: 'completed', category: 'subscription', user: a, amount: 99, metadata: { plan: 'APEX Plus', fulfilled: true, fulfillmentResult: { plan: 'APEX Plus', expiresAt: 'stored-expiry' } } };
  stub(Transaction, 'findById', () => ({ session: async () => tx }));
  stub(User, 'findById', () => { throw new Error('must not extend'); });
  assert.deepEqual(await handler(a, 'APEX Plus', tx), tx.metadata.fulfillmentResult);
});
test('calendar-month access clamps month end and preserves time instead of rolling into the following month', () => {
  const { extendMembership } = require('../dist/services/membershipExpiry');
  assert.equal(extendMembership(new Date('2027-01-31T09:10:11.000Z'), 1).toISOString(), '2027-02-28T09:10:11.000Z');
  assert.equal(extendMembership(new Date('2028-01-31T09:10:11.000Z'), 1).toISOString(), '2028-02-29T09:10:11.000Z');
});
test('HTTP support routes enforce owner, do not falsely confirm deletion and protect admin queue', async () => {
  process.env.JWT_SECRET = 'fixture-release-safety-secret';
  stub(Session, 'create', async value => value); stub(Session, 'findOne', async () => ({ userId: a }));
  stub(User, 'findById', async () => ({ _id: a, role: 'user' }));
  const token = await require('../dist/services/authSession').issueApplicationSession({ _id: a });
  let saved;
  stub(Request, 'findOne', async () => null);
  stub(Request, 'create', async value => { saved = value; return { ...value, _id: 'request-reference', status: 'open' }; });
  const app = express(); app.use(express.json()); app.use('/support', require('../dist/routes/supportRoutes').default);
  const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  const base = 'http://127.0.0.1:' + server.address().port + '/support';
  const headers = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token };
  try {
    assert.equal((await fetch(base + '/requests')).status, 401);
    assert.equal((await fetch(base + '/admin', { headers })).status, 403);
    const r = await fetch(base + '/requests', { method: 'POST', headers, body: JSON.stringify({ kind: 'account_deletion', user: b, status: 'resolved', reason: 'Delete my account' }) });
    assert.equal(r.status, 201); const data = await r.json(); assert.equal(data.status, 'open'); assert.equal(data.deleted, undefined); assert.equal(saved.user, a); assert.equal(saved.status, undefined);
    const invalid = await fetch(base + '/requests', { method: 'POST', headers, body: JSON.stringify({ kind: 'not-real', reason: 'test' }) }); assert.equal(invalid.status, 400);
  } finally { await new Promise(resolve => server.close(resolve)); }
});
