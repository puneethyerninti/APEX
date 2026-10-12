const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

function fixture(request = async () => {}, baseURL = 'https://backend.example/api') {
  let now = 0;
  const calls = [];
  const dependencies = {
    axios: { default: { get: (...args) => { calls.push(args); return request(); } } },
    '@/services/api': { api: { defaults: { baseURL } } },
  };
  const source = fs.readFileSync('src/services/authPreparation.ts', 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  function clock() { return now; }
  return { source, code, dependencies, calls, clock, advance: ms => { now += ms; } };
}

function load(options) {
  const f = fixture(...(options || []));
  const vm = require('node:vm'); const exports = {};
  vm.runInNewContext(f.code, { exports, require: name => f.dependencies[name], URL, Promise,
    Date: { now: f.clock }, window: { location: { href: 'https://shop.example/login' } } });
  return { ...f, ...exports };
}

test('warmup is anonymous, overlaps login, deduplicates mounts and has no keep-alive loop', async () => {
  let finish;
  const f = load([() => new Promise(resolve => { finish = resolve; })]);
  const first = f.warmAuthBackend(); const second = f.warmAuthBackend();
  assert.equal(first, second); assert.equal(f.calls.length, 1);
  assert.equal(f.calls[0][0], 'https://backend.example/');
  assert.equal(f.calls[0][1].timeout, 65000); assert.equal(f.calls[0][1].withCredentials, false);
  assert.equal(f.calls[0][1].headers, undefined);
  finish(); await first; await f.warmAuthBackend(); assert.equal(f.calls.length, 1);
  f.advance(60000); const next = f.warmAuthBackend(); assert.equal(f.calls.length, 2); finish(); await next;
  assert.doesNotMatch(f.source, /setInterval|signInWithPhoneNumber|\/user\/session|Authorization/);
});
test('warmup failure or invalid URL never rejects or approves a sign-in', async () => {
  const f = load([async () => { throw new Error('network timeout'); }]);
  await f.warmAuthBackend(); assert.equal(f.calls.length, 1);
  for (const url of ['https://[invalid', 'javascript:alert(1)', 'file:///private']) {
    const invalid = load([async () => {}, url]); await invalid.warmAuthBackend(); assert.equal(invalid.calls.length, 0);
  }
});
test('CAPTCHA preparation renders once concurrently and reuses the same widget for OTP request', async () => {
  const f = load(); let created = 0, renders = 0, finish;
  const captcha = f.createRecaptchaPreparation(() => { created++; return { render: () => { renders++; return new Promise(resolve => { finish = resolve; }); }, clear() {} }; });
  const first = captcha.prepare(); const second = captcha.prepare(); assert.equal(first, second);
  await Promise.resolve(); assert.equal(renders, 1); const before = captcha.get(); finish(1); await first;
  assert.equal(captcha.get(), before); assert.equal(created, 1);
});
test('CAPTCHA preparation failure is recoverable and discarded instead of weakening the OTP verifier', async () => {
  const f = load(); let created = 0, cleared = 0;
  const captcha = f.createRecaptchaPreparation(() => { created++; return { render: async () => { throw new Error('provider failure'); }, clear: () => { cleared++; } }; });
  await captcha.prepare(); assert.equal(cleared, 1); captcha.get(); assert.equal(created, 2);
  captcha.clear(); captcha.clear(); assert.equal(cleared, 2);
  const constructorFailure = f.createRecaptchaPreparation(() => { throw new Error('SDK unavailable'); });
  await constructorFailure.prepare(); assert.throws(() => constructorFailure.get());
});
test('unmount before rendering prevents provider work and late failures cannot clear a new widget', async () => {
  const f = load(); let renders = 0, clears = 0, reject;
  const captcha = f.createRecaptchaPreparation(() => ({ render: () => { renders++; return new Promise((_, fail) => { reject = fail; }); }, clear: () => { clears++; } }));
  const cancelled = captcha.prepare(); captcha.clear(); await cancelled; assert.equal(renders, 0);
  const pending = captcha.prepare(); await Promise.resolve(); captcha.clear(); const replacement = captcha.get();
  reject(new Error('old failure')); await pending; assert.equal(captcha.get(), replacement); assert.equal(clears, 2);
});
test('screen prepares CAPTCHA only on customer phone focus and keeps existing security and cooldown gates', () => {
  const source = fs.readFileSync('src/components/PhoneSignIn.tsx', 'utf8');
  assert.match(source, /onFocus=\{\(\) => \{ if \(!adminPortal\) void recaptcha\(\)\.prepare\(\)/);
  assert.match(source, /requestPhoneOtp\(phone, adminPortal, \(\) => recaptcha\(\)\.get\(\)/);
  assert.match(source, /confirmation\.current\.confirm\(otp\)/); assert.match(source, /resendSeconds\(deadline\) > 0/);
  assert.match(source, /generation\.current\+\+; clearVerifier\(\)/);
  assert.match(source, /useEffect\(\(\) => \{ void warmAuthBackend\(\); \}, \[\]\)/);
});
