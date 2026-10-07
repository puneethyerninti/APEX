const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

function policy(native) {
  const source = fs.readFileSync(path.join(__dirname, '../src/services/checkoutPolicy.ts'), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const mod = new Module(__filename);
  mod.require = name => name === '@capacitor/core' ? { Capacitor: { isNativePlatform: () => native } } : require(name);
  mod._compile(code, __filename);
  return mod.exports;
}

test('web keeps genuine digital service checkout, native blocks it without Play Billing', () => {
  const old = process.env.NEXT_PUBLIC_DISTRIBUTION;
  delete process.env.NEXT_PUBLIC_DISTRIBUTION;
  try {
    for (const category of ['matrimony', 'subscription', 'academy_enrollment']) {
      assert.equal(policy(false).canUseServiceCheckout(category), true);
      assert.throws(() => policy(true).assertServiceCheckoutAllowed(category), /unavailable/);
    }
    for (const category of ['mobile_recharge', 'bbps_payment', 'cab']) {
      assert.equal(policy(true).canUseServiceCheckout(category), true);
    }
  } finally {
    if (old === undefined) delete process.env.NEXT_PUBLIC_DISTRIBUTION;
    else process.env.NEXT_PUBLIC_DISTRIBUTION = old;
  }
});

test('Play distribution blocks digital checkout even before the native bridge initializes', () => {
  const old = process.env.NEXT_PUBLIC_DISTRIBUTION;
  process.env.NEXT_PUBLIC_DISTRIBUTION = 'google-play';
  try { assert.throws(() => policy(false).assertServiceCheckoutAllowed('matrimony'), /unavailable/); }
  finally {
    if (old === undefined) delete process.env.NEXT_PUBLIC_DISTRIBUTION;
    else process.env.NEXT_PUBLIC_DISTRIBUTION = old;
  }
});

test('all digital purchase entry points guard before loading Razorpay or creating an order', () => {
  for (const file of ['src/app/matrimony/page.tsx', 'src/app/academy/page.tsx', 'src/components/GlobalModals.tsx']) {
    const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
    const guard = source.indexOf('assertServiceCheckoutAllowed(', source.indexOf('export default'));
    assert.ok(guard !== -1 && guard < source.indexOf('await loadRazorpay()'), file);
  }
});
