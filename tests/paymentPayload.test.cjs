const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const Module = require('node:module');
const compiled = ts.transpileModule(fs.readFileSync(require('node:path').join(__dirname, '../src/services/paymentPayload.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const mod = new Module(__filename); mod._compile(compiled, __filename);
const { parsePaymentPayload, makeUpiIntent } = mod.exports;
test('APEX receive QR resolves only a valid verified-mobile-shaped destination', () => {
  assert.equal(parsePaymentPayload('apex://pay?phone=9000000000&name=User').isApex, true);
  assert.throws(() => parsePaymentPayload('apex://pay?phone=123'));
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
