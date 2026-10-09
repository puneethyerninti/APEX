const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
function compile(file, dependencies = {}) {
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/services/', file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const mod = new Module(__filename);
  mod.require = name => Object.hasOwn(dependencies, name) ? dependencies[name] : require(name);
  mod._compile(code, __filename); return mod.exports;
}
const payload = compile('paymentPayload.ts');
test('native UPI handoff validates the URI, requires installed plugin, and never treats opening as payment success', async () => {
  let calls = 0;
  const Capacitor = { isNativePlatform: () => true, getPlatform: () => 'android', isPluginAvailable: () => true };
  let opened = true;
  const { openUpiApp } = compile('upiLauncher.ts', { '@capacitor/core': { Capacitor, registerPlugin: () => ({ open: async () => { calls++; return { opened }; } }) }, './paymentPayload': payload });
  await assert.rejects(openUpiApp('apex://pay?phone=9000000000'), /old APEX/);
  assert.equal(calls, 0);
  assert.equal(await openUpiApp('upi://pay?pa=user@bank&am=1'), undefined);
  assert.equal(calls, 1);
  opened = false; await assert.rejects(openUpiApp('upi://pay?pa=user@bank&am=1'), /not confirmed/);
  Capacitor.isPluginAvailable = () => false;
  await assert.rejects(openUpiApp('upi://pay?pa=user@bank&am=1'), /Update/);
  assert.equal(calls, 2);
});
test('legacy transfer check requires an existing bound reference and cannot originate a new transfer', async () => {
  const entries = new Map(); let requests = 0;
  const priorStorage = global.localStorage;
  global.localStorage = { getItem: key => entries.get(key) || null, removeItem: key => entries.delete(key) };
  try {
    const api = { post: async (_url, body) => { requests++; assert.equal(body.idempotencyKey, 'existing-reference-123'); return { data: { success: true, transaction: { _id: 'stored-receipt' } } }; } };
    const { transferWallet, pendingWalletTransfer } = compile('walletTransfer.ts', { './api': { api } });
    const body = { userId: 'owner', recipientPhone: '9000000000', amount: 51, note: '' };
    await assert.rejects(transferWallet(body), /paused/); assert.equal(requests, 0);
    const item = { payload: body, key: 'existing-reference-123', fingerprint: JSON.stringify({ phone: body.recipientPhone, amount: 51, note: '' }) };
    entries.set('apex-pending-transfer:owner', JSON.stringify(item));
    await assert.rejects(transferWallet({ ...body, amount: 52 }), /previous transfer/); assert.equal(requests, 0);
    await transferWallet(body); assert.equal(requests, 1); assert.equal(pendingWalletTransfer('owner'), null);
    entries.set('apex-pending-transfer:owner', JSON.stringify({ ...item, payload: { ...body, userId: 'other' } }));
    assert.throws(() => pendingWalletTransfer('owner'), /could not be read/);
  } finally { global.localStorage = priorStorage; }
});
test('uncertain or rejected legacy receipt remains available for support reconciliation', async () => {
  const priorStorage = global.localStorage; const body = { userId: 'owner', recipientPhone: '9000000000', amount: 51 };
  const item = { key: 'existing-reference-123', payload: body, fingerprint: JSON.stringify({ phone: body.recipientPhone, amount: 51, note: '' }) };
  let removals = 0;
  global.localStorage = { getItem: () => JSON.stringify(item), removeItem: () => removals++ };
  try {
    const { transferWallet } = compile('walletTransfer.ts', { './api': { api: { post: async () => { throw { response: { status: 409 } }; } } } });
    await assert.rejects(transferWallet(body)); assert.equal(removals, 0);
  } finally { global.localStorage = priorStorage; }
});
test('personal payment screen cannot collect merchant wallet deposits or display fabricated success', () => {
  const source = fs.readFileSync(path.join(__dirname, '../src/app/payment/page.tsx'), 'utf8');
  assert.doesNotMatch(source, /loadRazorpay|razorpay\/order|crypto\.randomUUID|Payment Successful|Pay with Wallet|Topup/);
  assert.match(source, /Previous APEX Balance/); assert.match(source, /Continue in UPI app/);
  assert.match(source, /not verified by APEX/); assert.match(source, /No payment success is recorded/);
});
test('payment layout is server-rendered immediately without a session or full-screen loader', () => {
  const React = require('react'); const { renderToStaticMarkup } = require('react-dom/server');
  const source = fs.readFileSync(path.join(__dirname, '../src/app/payment/page.tsx'), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const mod = new Module(__filename);
  const dependencies = {
    'next/link': { default: ({ children, ...props }) => React.createElement('a', props, children) },
    '@/services/api': { api: {} }, '@/services/paymentPayload': payload,
    '@/services/upiLauncher': {}, '@/services/walletTransfer': {},
    '@/store/useAppStore': { useAppStore: selector => selector({ user: null }) },
    '@/context/SocketContext': { useSocket: () => ({ socket: null }) }, '@/components/PaymentQr': {},
    '@/config/apexPay': { APEX_PAY_ENABLED: true }, '@/components/ApexTv': {}
  };
  mod.require = name => Object.hasOwn(dependencies, name) ? dependencies[name] : require(name);
  mod._compile(code, __filename);
  const html = renderToStaticMarkup(React.createElement(mod.exports.default));
  for (const text of ['APEX Pay', 'UPI Payments', 'Scan &amp; Pay', 'Pay UPI ID', 'Previous APEX Balance', 'APEX History']) assert.ok(html.includes(text), text);
  assert.doesNotMatch(html, /Verifying session|Payment Successful|Topup/);
});
