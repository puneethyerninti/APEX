const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const Module = require('node:module');
const compiled = ts.transpileModule(fs.readFileSync(require('node:path').join(__dirname, '../src/services/paymentPayload.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const mod = new Module(__filename); mod._compile(compiled, __filename);
const { parsePaymentPayload, makeUpiIntent, makeReceiveQr } = mod.exports;
test('old APEX wallet QRs never become bank transfers', () => {
  assert.throws(() => parsePaymentPayload('apex://pay?phone=9000000000&name=User'), /old APEX wallet QR/);
  assert.throws(() => parsePaymentPayload('apex://pay?phone=123'));
});
test('ambiguous destinations, credentials and malformed paths are rejected', () => {
  for (const uri of ['upi://pay?pa=user@bank&pa=other@bank', 'upi://pay?pa=user@bank&am=1&am=2', 'upi://login:pass@pay?pa=user@bank', 'upi://pay/other?pa=user@bank', 'upi://pay?pa=user@bank#changed']) assert.throws(() => parsePaymentPayload(uri));
});
test('merchant metadata, fixed amount and minimum survive a bank app handoff', () => {
  const payee = parsePaymentPayload('upi://pay?pa=shop@bank&am=12.50&mam=10&tid=invoice1&tr=ref1&mc=1234&mode=02&orgid=000000');
  const uri = new URL(makeUpiIntent(payee, '12.50', 'Order'));
  for (const [key, value] of Object.entries({ tid: 'invoice1', tr: 'ref1', mc: '1234', mode: '02', orgid: '000000', mam: '10' })) assert.equal(uri.searchParams.get(key), value);
  assert.throws(() => makeUpiIntent(payee, '13', ''), /fixed QR amount/);
  assert.throws(() => makeUpiIntent({ ...payee, pa: 'other@bank' }, '12.50', ''), /Recipient/);
  assert.throws(() => makeUpiIntent(parsePaymentPayload('upi://pay?pa=user@bank&mam=10'), '9', ''), /minimum/);
});
test('receive QR uses only the explicitly supplied bank VPA, never phone or invented account', () => {
  const uri = new URL(makeReceiveQr('  owner@bank  '));
  assert.equal(uri.searchParams.get('pa'), 'owner@bank');
  assert.equal(uri.searchParams.get('cu'), 'INR');
  assert.equal(uri.searchParams.has('pn'), false);
  assert.equal(uri.searchParams.has('am'), false);
  assert.throws(() => makeReceiveQr('9000000000'));
});
test('non-payment schemes, currencies, signed QR and invalid precision are rejected', () => {
  for (const uri of ['https://pay?pa=user@bank', 'upi://other?pa=user@bank', 'upi://pay?pa=invalid', 'upi://pay?pa=user@bank&cu=USD', 'upi://pay?pa=user@bank&am=1.001', 'upi://pay?pa=user@bank&sign=signature']) assert.throws(() => parsePaymentPayload(uri));
});
test('UPI handoff preserves merchant reference, encodes note and never targets wallet', () => {
  const payee = parsePaymentPayload('upi://pay?pa=user@bank&tr=merchant-reference&mc=1234');
  const uri = new URL(makeUpiIntent(payee, '12.50', 'a & b'));
  assert.equal(uri.searchParams.get('am'), '12.50'); assert.equal(uri.searchParams.get('tn'), 'a & b');
  assert.equal(uri.searchParams.get('tr'), 'merchant-reference'); assert.equal(uri.searchParams.get('cu'), 'INR');
  assert.throws(() => makeUpiIntent({ ...payee, isApex: true }, '1', ''));
});
