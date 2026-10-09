const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

function load(file, dependencies = {}) {
  const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const mod = new Module(__filename);
  mod.require = name => Object.hasOwn(dependencies, name) ? dependencies[name] : require(name);
  mod._compile(code, __filename); return mod.exports;
}
const policy = load('src/services/phoneSignIn.ts');
function screen(session = {}, adminPortal = false) {
  const { default: PhoneSignIn } = load('src/components/PhoneSignIn.tsx', {
    'next/link': { default: ({ children, ...props }) => React.createElement('a', props, children) },
    '@/context/AuthContext': { useAuth: () => ({ isLoading: false, registrationRequired: false, error: '', ...session }) },
    '@/firebase.config': { auth: {} }, 'firebase/auth': {}, '@/services/phoneSignIn': policy, '@/services/phoneOtp': {}
  });
  return renderToStaticMarkup(React.createElement(PhoneSignIn, { adminPortal }));
}

test('login first screen is phone-only and available without waiting for authentication', () => {
  const html = screen({ isLoading: true });
  assert.match(html, /Mobile Number/); assert.match(html, /Get OTP/);
  assert.doesNotMatch(html, /Full Name|register-name|Verifying session|full-screen/);
});
test('only verified new-account onboarding renders the name form', () => {
  const html = screen({ registrationRequired: true, registrationPhone: '+919999999999' });
  assert.match(html, /Full Name/); assert.match(html, /Create Account/); assert.match(html, /Mobile verified/);
  assert.doesNotMatch(html, /login-phone/);
});
test('admin uses the same phone-only screen and never exposes a registration form', () => {
  const html = screen({ registrationRequired: true }, true);
  assert.match(html, /APEX Admin Portal/); assert.match(html, /Mobile Number/); assert.doesNotMatch(html, /Full Name|8247885289/);
});
test('mobile and name validation reject malformed input while accepting actual names', () => {
  for (const phone of ['1234567890', '+919999999999', '999999999', '99999999999', '999999999x']) assert.equal(policy.isIndianMobile(phone), false);
  assert.equal(policy.isIndianMobile('9999999999'), true);
  for (const name of ['', ' ', 'A', 'A'.repeat(101), 'A\nB']) assert.equal(policy.isProfileName(name), false);
  for (const name of ['Y Puneeth', "O'Connor", '\u0c2a\u0c42\u0c28\u0c40\u0c24\u0c4d']) assert.equal(policy.isProfileName(name), true);
});
test('resend cooldown is deadline-based, so background timers cannot enable early resends', () => {
  assert.equal(policy.resendSeconds(60000, 0), 60); assert.equal(policy.resendSeconds(60000, 59999), 1);
  assert.equal(policy.resendSeconds(60000, 61000), 0);
});
test('Firebase errors are actionable and never expose raw provider errors', () => {
  assert.match(policy.phoneSignInError({ code: 'auth/invalid-verification-code' }), /incorrect/);
  assert.match(policy.phoneSignInError({ code: 'auth/unauthorized-domain' }), /support/);
  assert.doesNotMatch(policy.phoneSignInError({ message: 'private secret' }), /private secret/);
});

test('application identity and cached screens are cleared on account changes', () => {
  let state = { user: null, walletBalance: 0 };
  const store = { getState: () => ({ ...state, setUser: user => state.user = user, setWalletBalance: value => state.walletBalance = value }) };
  const items = new Map();
  const oldStorage = global.localStorage;
  global.localStorage = { setItem: (key, value) => items.set(key, value), removeItem: key => items.delete(key) };
  try {
    const session = load('src/services/applicationSession.ts', { '@/store/useAppStore': { useAppStore: store } });
    session.applyApplicationSession({ token: 'fixture', user: { _id: 'user-a', name: 'Saved Name', walletBalance: 51 } });
    assert.equal(state.user.name, 'Saved Name'); assert.equal(state.walletBalance, 51);
    const generation = session.sessionGeneration(); session.clearApplicationSession();
    assert.equal(state.user, null); assert.equal(state.walletBalance, 0); assert.equal(items.has('apex_token'), false);
    assert.ok(session.sessionGeneration() > generation);
    assert.throws(() => session.applyApplicationSession({ registrationRequired: true }), /Invalid/);
    const source = fs.readFileSync(path.join(__dirname, '../src/components/Providers.tsx'), 'utf8');
    assert.match(source, /SocketProvider key=\{accountId\}/); assert.match(source, /\[accountId\]/);
  } finally { global.localStorage = oldStorage; }
});
