const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const ts = require('typescript');

function fixture(reply = async () => ({ data: { success: true } })) {
  const calls = { checks: [], sms: [], verifiers: 0 };
  const axios = { post: async (...args) => { calls.checks.push(args); return reply(); }, CanceledError: class extends Error {} };
  const dependencies = {
    axios: { default: axios },
    'firebase/auth': { signInWithPhoneNumber: async (...args) => { calls.sms.push(args); return 'confirmation'; } },
    '@/firebase.config': { auth: 'firebase' },
    '@/services/api': { api: { defaults: { baseURL: 'https://backend.example/api' } } },
    '@/services/phoneSignIn': { isIndianMobile: phone => /^[6-9]\d{9}$/.test(phone) },
  };
  const code = ts.transpileModule(fs.readFileSync('src/services/phoneOtp.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
  }).outputText;
  const mod = new Module(__filename); mod.require = name => dependencies[name]; mod._compile(code, __filename);
  return { calls, request: (admin = true, current = () => true, phone = '9999999999') =>
    mod.exports.requestPhoneOtp(phone, admin, () => { calls.verifiers++; return 'recaptcha'; }, current) };
}

test('admin denial, provider failures and malformed approvals never create reCAPTCHA or request SMS', async () => {
  for (const [reply, code] of [
    [async () => { throw { response: { status: 403 } }; }, 'admin/not-authorized'],
    [async () => { throw { response: { status: 503 } }; }, 'admin/unavailable'],
    [async () => { throw { response: { status: 429 } }; }, 'auth/too-many-requests'],
    [async () => { throw { code: 'ETIMEDOUT' }; }, 'admin/unavailable'],
    [async () => ({ data: { success: false } }), 'admin/not-authorized'],
    [async () => ({ data: {} }), 'admin/not-authorized'],
  ]) {
    const { request, calls } = fixture(reply);
    await assert.rejects(request(), error => error.code === code);
    assert.equal(calls.verifiers, 0); assert.equal(calls.sms.length, 0);
  }
});
test('eligible admin requests SMS only after an explicit backend approval', async () => {
  const { request, calls } = fixture(); assert.equal(await request(), 'confirmation');
  assert.deepEqual(calls.checks, [['https://backend.example/api/user/admin-otp/eligibility', { phone: '+919999999999' }, { timeout: 10000 }]]);
  assert.deepEqual(calls.sms, [['firebase', '+919999999999', 'recaptcha']]); assert.equal(calls.verifiers, 1);
});
test('customer login remains phone-only and does not call admin eligibility', async () => {
  const { request, calls } = fixture(); await request(false);
  assert.equal(calls.checks.length, 0); assert.equal(calls.sms.length, 1);
});
test('navigation away during admin eligibility cannot send a delayed SMS', async () => {
  let resolve; let current = true;
  const { request, calls } = fixture(() => new Promise(done => { resolve = done; }));
  const work = request(true, () => current); current = false; resolve({ data: { success: true } });
  await assert.rejects(work); assert.equal(calls.verifiers, 0); assert.equal(calls.sms.length, 0);
});
test('every resend checks the current role and denies an admin who lost access', async () => {
  let checks = 0;
  const { request, calls } = fixture(async () => { if (++checks > 1) throw { response: { status: 403 } }; return { data: { success: true } }; });
  await request(); await assert.rejects(request(), error => error.code === 'admin/not-authorized');
  assert.equal(calls.checks.length, 2); assert.equal(calls.sms.length, 1);
});
test('invalid numbers cannot call eligibility or Firebase', async () => {
  const { request, calls } = fixture(); await assert.rejects(request(true, () => true, '123'), error => error.code === 'auth/invalid-phone-number');
  assert.equal(calls.checks.length, 0); assert.equal(calls.sms.length, 0);
});
