const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

function compile(file, dependencies = {}) {
  const source = fs.readFileSync(path.join(__dirname, '../src', file), 'utf8');
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX }
  }).outputText;
  const mod = new Module(__filename);
  mod.require = name => Object.hasOwn(dependencies, name) ? dependencies[name] : require(name);
  mod._compile(code, __filename);
  return mod.exports;
}

const config = compile('config/apexPay.ts');
const link = { default: ({ children, ...props }) => React.createElement('a', props, children) };
const tv = compile('components/ApexTv.tsx', { 'next/link': link, '@/config/apexPay': config });

test('production switch defaults to TV and the exact supplied channel', () => {
  assert.equal(config.APEX_PAY_ENABLED, false);
  assert.equal(config.APEX_TV_CHANNEL_URL, 'https://www.youtube.com/@Apexstore007');
});

test('only exact public TV routes bypass the frontend sign-in redirect', () => {
  for (const enabled of [false, true]) {
    const source = fs.readFileSync(path.join(__dirname, '../src/config/apexPay.ts'), 'utf8');
    const mod = new Module(__filename);
    mod._compile(ts.transpileModule(source.replace('APEX_PAY_ENABLED = false', `APEX_PAY_ENABLED = ${enabled}`), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
    }).outputText, __filename);
    assert.equal(mod.exports.isPublicApexTvPath('/apex-tv'), true);
    assert.equal(mod.exports.isPublicApexTvPath('/payment'), !enabled);
    for (const route of ['/finance', '/admin-dashboard', '/payment/receipt', '/apex-tv-admin', '/account', '/utility']) {
      assert.equal(mod.exports.isPublicApexTvPath(route), false, route);
    }
  }
  const auth = fs.readFileSync(path.join(__dirname, '../src/context/AuthContext.tsx'), 'utf8');
  assert.match(auth, /!isAuthenticated.*!isPublicApexTvPath\(pathname\).*router.replace\('\/login'\)/);
});

test('TV renders immediately with real branding and safe channel links, not invented videos', () => {
  const html = renderToStaticMarkup(React.createElement(tv.default));
  assert.match(html, /APEX TV/);
  assert.match(html, /@Apexstore007/);
  assert.match(html, /Watch on YouTube/);
  assert.match(html, /src="\/APEX logo.jpeg"/);
  assert.equal((html.match(/href="https:\/\/www.youtube.com\/@Apexstore007"/g) || []).length, 2);
  assert.equal((html.match(/rel="noopener noreferrer"/g) || []).length, 2);
  assert.doesNotMatch(html, /iframe|Verifying session|Loading|upi:\/\/|wallet|payment-reader/);
});

test('old payment and scan links render TV without mounting any payment services', () => {
  const page = compile('app/payment/page.tsx', {
    'next/link': link, '@/services/api': { api: {} },
    '@/services/paymentPayload': {}, '@/services/upiLauncher': {}, '@/services/walletTransfer': {},
    '@/store/useAppStore': { useAppStore: () => { throw new Error('Payment state must not mount'); } },
    '@/context/SocketContext': { useSocket: () => { throw new Error('Payment socket must not mount'); } },
    '@/components/PaymentQr': {}, '@/components/ApexTv': tv, '@/config/apexPay': config
  });
  const html = renderToStaticMarkup(React.createElement(page.default));
  assert.match(html, /APEX TV/);
  assert.doesNotMatch(html, /APEX Pay|Scan &amp; Pay|Previous APEX Balance|payment-reader/);
  const source = fs.readFileSync(path.join(__dirname, '../src/app/payment/page.tsx'), 'utf8');
  assert.match(source, /return APEX_PAY_ENABLED \? <ApexPay \/> : <ApexTv \/>/);
  assert.match(source, /function ApexPay\(\)/);
});

test('TV has its own static-export-compatible route', () => {
  const page = compile('app/apex-tv/page.tsx', { '@/components/ApexTv': tv });
  assert.match(renderToStaticMarkup(React.createElement(page.default)), /APEX TV/);
  assert.equal(page.metadata.title, 'APEX TV | APEX');
});

test('navigation hides payment and scan while paused and restores both with the switch', () => {
  for (const enabled of [false, true]) {
    const nav = compile('components/BottomNav.tsx', {
      'next/link': link, 'next/navigation': { usePathname: () => enabled ? '/payment' : '/apex-tv' },
      '@/config/apexPay': { APEX_PAY_ENABLED: enabled }
    });
    const html = renderToStaticMarkup(React.createElement(nav.default));
    if (enabled) {
      assert.match(html, /href="\/payment\?scan=true"/);
      assert.match(html, /<span>Payments<\/span>/);
      assert.match(html, /<span[^>]*>Scan<\/span>/);
    } else {
      assert.match(html, /href="\/apex-tv"/);
      assert.match(html, /<span>APEX TV<\/span>/);
      assert.doesNotMatch(html, /href="\/payment|<span[^>]*>Scan<\/span>|Payments/);
    }
    for (const label of ['Home', 'Invest', 'Account']) assert.ok(html.includes(label));
  }
});
