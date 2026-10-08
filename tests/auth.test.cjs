const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');
const { getApps, initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const User = require('../dist/models/User').default;
const AuthSession = require('../dist/models/AuthSession').default;
const Notification = require('../dist/models/Notification').default;
const UtilityTransaction = require('../dist/models/UtilityTransaction').default;
const Job = require('../dist/models/Job').default;
const controller = require('../dist/controllers/userController');
const { issueApplicationSession, validateApplicationSession } = require('../dist/services/authSession');
const { requireAuth, requireAdmin } = require('../dist/middleware/authMiddleware');
const id = '000000000000000000000001';
const other = '000000000000000000000002';
process.env.JWT_SECRET = 'auth-tests-not-production';
if (!getApps().length) initializeApp({ projectId: 'isolated-auth-tests' });
const undo = [];
function stub(object, key, value) { const old = object[key]; object[key] = value; undo.push(() => object[key] = old); }
afterEach(() => { while (undo.length) undo.pop()(); });
const query = value => ({ limit() { return this; }, sort() { return this; }, lean() { return this; }, then(resolve, reject) { return Promise.resolve(value).then(resolve, reject); } });
const response = () => ({ code: 200, headers: {}, setHeader(key, value) { this.headers[key] = value; }, status(value) { this.code = value; return this; }, json(body) { this.body = body; return this; } });
const proof = extra => ({ uid: 'verified-uid', phone_number: '+919999999999', auth_time: Math.floor(Date.now() / 1000), firebase: { sign_in_provider: 'phone' }, ...extra });
function fixture(existing = [], identity = proof()) {
  stub(getAuth(), 'verifyIdToken', async (token, revoked) => { assert.equal(token, 'firebase-proof'); assert.equal(revoked, true); return identity; });
  stub(User, 'find', () => query(existing));
  stub(AuthSession, 'create', async value => value);
  stub(User, 'create', () => { throw new Error('Unexpected account creation'); });
}
async function exchange(body = {}) {
  const res = response(); await controller.exchangeFirebaseSession({ headers: { authorization: 'Bearer firebase-proof' }, body }, res); return res;
}
const account = extra => ({ _id: id, firebaseUid: 'verified-uid', phone: '+919999999999', name: 'Saved Full Name', email: '919999999999@apex.local', role: 'user', apexPlan: 'Free', ...extra });

test('new verified phone needs registration, without creating an account or issuing a JWT', async () => {
  fixture(); const res = await exchange(); assert.equal(res.code, 200);
  assert.deepEqual(res.body, { registrationRequired: true, phone: '+919999999999' });
  assert.equal(res.headers['Cache-Control'], 'no-store');
});
test('post-OTP registration creates only a normal account with the validated full name', async () => {
  fixture(); stub(User, 'create', async value => { assert.equal(value.role, 'user'); assert.equal(value.phone, '+919999999999'); assert.equal(value.name, 'New User'); return account(value); });
  const res = await exchange({ name: ' New User ', phone: '8888888888', role: 'admin', walletBalance: 100 });
  assert.equal(res.code, 200); assert.equal(res.body.user.name, 'New User'); assert.equal(res.body.user.role, 'user'); assert.equal(res.body.user.email, '');
  const claims = jwt.verify(res.body.token, process.env.JWT_SECRET, { issuer: 'apex-backend', audience: 'apex-app', algorithms: ['HS256'] });
  assert.equal(claims.authVersion, 3); assert.ok(claims.jti); assert.equal(claims.exp - claims.iat, 3600);
});
test('existing phone-only login preserves the last saved name even if an attacker supplies a replacement', async () => {
  fixture([account()]); const res = await exchange({ name: 'Overwrite Name', role: 'admin' });
  assert.equal(res.code, 200); assert.equal(res.body.user.name, 'Saved Full Name'); assert.equal(res.body.user.role, 'user');
});
test('invalid registration names never create a user', async () => {
  fixture(); for (const name of ['', ' ', 'A', 'A'.repeat(101), 'A\nB', {}, 42]) { const res = await exchange({ name }); assert.equal(res.code, 400); }
});
test('registration requires recent phone authentication, not just a freshly refreshed old token', async () => {
  fixture([], proof({ auth_time: Math.floor(Date.now() / 1000) - 901 })); assert.equal((await exchange({ name: 'New User' })).code, 401);
});
test('non-phone and non-Indian Firebase identities cannot sign in', async () => {
  for (const identity of [proof({ firebase: { sign_in_provider: 'password' } }), proof({ phone_number: '+14155552671' }), proof({ phone_number: undefined })]) {
    fixture([], identity); assert.equal((await exchange()).code, 403);
  }
});
test('conflicting Firebase UID and phone bindings are rejected without overwriting or merging balances', async () => {
  for (const rows of [[account({ firebaseUid: 'another-uid' })], [account({ phone: '+918888888888' })], [account(), account({ _id: other })]]) {
    fixture(rows); assert.ok([403, 409].includes((await exchange()).code));
  }
});
test('legacy account is claimed atomically without changing its saved name', async () => {
  fixture([account({ firebaseUid: undefined })]);
  stub(User, 'findOneAndUpdate', async (filter, update) => { assert.ok(filter.$or); assert.equal(update.$set.firebaseUid, 'verified-uid'); return account(); });
  const res = await exchange(); assert.equal(res.code, 200); assert.equal(res.body.user.name, 'Saved Full Name');
});
test('lost legacy claim race cannot issue a session', async () => {
  fixture([account({ firebaseUid: undefined })]); stub(User, 'findOneAndUpdate', async () => null); assert.equal((await exchange()).code, 409);
});
test('concurrent registration uses the winning identity without changing its name', async () => {
  fixture(); stub(User, 'create', async () => { throw Object.assign(new Error('duplicate'), { code: 11000 }); });
  stub(User, 'findOne', async () => account()); const res = await exchange({ name: 'Second Name' });
  assert.equal(res.code, 200); assert.equal(res.body.user.name, 'Saved Full Name');
});
test('admin portal never creates users or grants privileges based on a submitted phone or role', async () => {
  for (const rows of [[], [account()]]) { fixture(rows); assert.equal((await exchange({ intent: 'admin', role: 'admin', name: 'Admin User' })).code, 403); }
  fixture([account({ role: 'admin' })]); assert.equal((await exchange({ intent: 'admin' })).code, 200);
});
test('disabled accounts cannot exchange Firebase proof for an application session', async () => {
  fixture([account({ isDisabled: true })]); assert.equal((await exchange()).code, 403);
});
test('invalid Firebase proof is unauthorized and configuration errors are sanitized unavailable responses', async () => {
  fixture();
  for (const [code, expected] of [['auth/id-token-revoked', 401], ['app/invalid-credential', 503]]) {
    stub(getAuth(), 'verifyIdToken', async () => { throw Object.assign(new Error('private-key-secret'), { code }); });
    const res = await exchange(); assert.equal(res.code, expected); assert.doesNotMatch(JSON.stringify(res.body), /private-key-secret/);
  }
});

async function activeSession(role = 'user') {
  stub(AuthSession, 'create', async value => value);
  stub(AuthSession, 'findOne', async filter => { assert.equal(filter.userId, id); assert.ok(filter.expiresAt.$gt instanceof Date); return { userId: id }; });
  stub(User, 'findById', async () => account({ role }));
  return issueApplicationSession(account({ role }));
}
test('authorization uses the live database role, not JWT role claims', async () => {
  const token = await activeSession('user');
  const res = response(); let next = false; await requireAdmin({ headers: { authorization: 'Bearer ' + token } }, res, () => next = true);
  assert.equal(res.code, 403); assert.equal(next, false);
  stub(User, 'findById', async () => account({ role: 'admin' }));
  await requireAdmin({ headers: { authorization: 'Bearer ' + token } }, response(), () => next = true); assert.equal(next, true);
});
test('legacy, wrong audience, expired and wrong algorithm JWTs are rejected', async () => {
  await activeSession();
  for (const options of [{}, { audience: 'other' }, { expiresIn: -1 }, { algorithm: 'HS384' }]) {
    const token = jwt.sign({ id, authVersion: 3 }, process.env.JWT_SECRET, { issuer: 'apex-backend', audience: 'apex-app', jwtid: 'test-jti', expiresIn: 60, ...options });
    if (!Object.keys(options).length) { const legacy = jwt.sign({ id, authVersion: 2 }, process.env.JWT_SECRET); await assert.rejects(validateApplicationSession(legacy), e => e.status === 401); }
    else await assert.rejects(validateApplicationSession(token), e => e.status === 401);
  }
});
test('revoked sessions and deleted or disabled users immediately lose access', async () => {
  const token = await activeSession();
  stub(AuthSession, 'findOne', async () => null); await assert.rejects(validateApplicationSession(token), e => e.status === 401);
  stub(AuthSession, 'findOne', async () => ({}));
  for (const user of [null, account({ isDisabled: true })]) { stub(User, 'findById', async () => user); await assert.rejects(validateApplicationSession(token), e => e.status === 401); }
});
test('database outage fails closed as 503 without leaking database details', async () => {
  const token = await activeSession(); stub(AuthSession, 'findOne', async () => { throw new Error('mongodb-secret-uri'); });
  const res = response(); await requireAuth({ headers: { authorization: 'Bearer ' + token } }, res, () => { throw new Error('Must not authorize'); });
  assert.equal(res.code, 503); assert.doesNotMatch(JSON.stringify(res.body), /mongodb-secret-uri/);
});
test('logout revokes only the authenticated session, and its token cannot be reused', async () => {
  const token = await activeSession(); let revoked = false;
  const claims = jwt.decode(token);
  stub(AuthSession, 'deleteOne', async filter => { assert.deepEqual(filter, { tokenId: claims.jti, userId: id }); revoked = true; });
  const res = response(); await controller.logoutSession({ user: await validateApplicationSession(token) }, res); assert.equal(res.code, 200); assert.equal(revoked, true);
  stub(AuthSession, 'findOne', async () => null); await assert.rejects(validateApplicationSession(token), e => e.status === 401);
});

test('actual HTTP notification, utility and content routes enforce sign-in, ownership and admin roles', async () => {
  const token = await activeSession();
  stub(Notification, 'findOneAndUpdate', async filter => { assert.equal(filter.user, id); return null; });
  stub(UtilityTransaction, 'findOne', filter => { assert.equal(filter.userId, id); return query(null); });
  stub(UtilityTransaction, 'create', () => { throw new Error('No direct Eko payment'); });
  const app = express(); app.use(express.json());
  for (const route of ['user', 'notification', 'utility', 'academy', 'jobs', 'wealth', 'realty', 'lead']) app.use('/' + route, require('../dist/routes/' + route + 'Routes').default);
  const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  try {
    const base = 'http://127.0.0.1:' + server.address().port;
    const headers = { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' };
    for (const [method, path, expected, body = {}] of [
      ['GET', '/notification/user/' + other, 404], ['PUT', '/notification/' + other + '/read', 404],
      ['PUT', '/notification/mark-all-read', 404, { userId: other }], ['POST', '/notification/email', 403],
      ['GET', '/utility/history/' + other, 404], ['GET', '/utility/transactions/' + other + '/status', 404],
      ['POST', '/utility/pay', 409], ['POST', '/academy/courses', 403], ['POST', '/jobs/', 403], ['POST', '/wealth/seed', 403],
      ['POST', '/realty/property', 400], ['POST', '/lead/', 400]
    ]) {
      const anonymous = await fetch(base + path, { method }); assert.equal(anonymous.status, 401, path);
      const result = await fetch(base + path, { method, headers, ...(method !== 'GET' ? { body: JSON.stringify(body) } : {}) }); assert.equal(result.status, expected, path);
    }
  } finally { await new Promise(resolve => server.close(resolve)); }
});
test('public jobs never expose resumes or private application records', async () => {
  stub(Job, 'find', filter => { assert.deepEqual(filter, { status: 'approved', type: { $ne: 'Application' } }); return query([]); });
  const res = response(); await require('../dist/controllers/jobsController').getJobs({}, res); assert.equal(res.code, 200);
});
test('profile update persists the name and blocks active image content and privilege edits', async () => {
  let saves = 0; const user = account({ async save() { saves++; } }); stub(User, 'findById', async () => user);
  let res = response(); await controller.updateUserProfile({ user: { id }, body: { name: 'Edited Full Name', role: 'admin', phone: '8888888888' } }, res);
  assert.equal(res.code, 200); assert.equal(res.body.user.name, 'Edited Full Name'); assert.equal(user.role, 'user'); assert.equal(saves, 1);
  for (const profilePicture of ['javascript:alert(1)', 'data:image/svg+xml;base64,test', 'http://tracker.example/a']) {
    res = response(); await controller.updateUserProfile({ user: { id }, body: { profilePicture } }, res); assert.equal(res.code, 400);
  }
  assert.equal(saves, 1);
});

test('socket rooms use the authenticated identity and revoked sessions cannot send packets', async () => {
  const token = await activeSession('admin');
  const http = require('node:http');
  const io = require('../dist/utils/socketManager').initSocket(http.createServer());
  const rooms = new Set(), listeners = {}; let packetGuard, disconnected = false;
  const socket = { handshake: { auth: { token } }, join(room) { rooms.add(room); }, leave(room) { rooms.delete(room); },
    use(fn) { packetGuard = fn; }, once(event, fn) { listeners[event] = fn; },
    disconnect() { disconnected = true; listeners.disconnect?.(); } };
  try {
    await new Promise((resolve, reject) => io.of('/')._fns[0](socket, error => error ? reject(error) : resolve()));
    assert.ok(rooms.has('user_' + id)); assert.ok(rooms.has('admin_room')); assert.ok(rooms.has('session_' + jwt.decode(token).jti));
    stub(User, 'findById', async () => account({ role: 'user' }));
    await new Promise((resolve, reject) => packetGuard(['chat'], error => error ? reject(error) : resolve()));
    assert.equal(socket.user.role, 'user'); assert.equal(rooms.has('admin_room'), false);
    stub(AuthSession, 'findOne', async () => null);
    const error = await new Promise(resolve => packetGuard(['chat'], resolve)); assert.match(error.message, /expired/); assert.equal(disconnected, true);
  } finally { socket.disconnect(); io.close(); }
});
test('untrusted browser origins are not in the deployed HTTP and socket allowlist', () => {
  const origins = require('../dist/services/allowedOrigins').allowedOrigins();
  assert.ok(origins.includes('https://www.apextc.shop')); assert.ok(origins.includes('https://rivan-123.web.app'));
  assert.equal(origins.includes('https://attacker.example'), false); assert.equal(origins.includes('*'), false);
});
test('logout detaches this device notification token without clearing other devices', async () => {
  await activeSession(); stub(AuthSession, 'deleteOne', async () => ({}));
  stub(User, 'updateOne', async (filter, update) => {
    assert.deepEqual(filter, { _id: id }); assert.deepEqual(update, { $pull: { fcmTokens: 'this-device-only' } });
  });
  const res = response(); await controller.logoutSession({ user: { id, tokenId: 'session' }, body: { fcmToken: 'this-device-only' } }, res); assert.equal(res.code, 200);
});
