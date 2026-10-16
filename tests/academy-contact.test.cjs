const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

function compile(file, dependencies = {}) {
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX }
  }).outputText;
  const mod = new Module(__filename);
  mod.require = name => Object.hasOwn(dependencies, name) ? dependencies[name] : require(name);
  mod._compile(code, __filename);
  return mod.exports;
}

const config = compile('config/support.ts');
const email = compile('components/SupportEmailLink.tsx', { '@/config/support': config });
const offerings = compile('components/AcademyOfferings.tsx', { '@/components/SupportEmailLink': email });
const link = { default: ({ children, ...props }) => React.createElement('a', props, children) };
const policy = compile('components/PolicyPage.tsx', { 'next/link': link, '@/components/SupportEmailLink': email });

test('support email is exact, clickable, and permits wrapping on narrow screens', () => {
  assert.equal(config.SUPPORT_EMAIL, 'support@apextradingcompanystore.co.in');
  const html = renderToStaticMarkup(React.createElement(email.default));
  assert.match(html, /href="mailto:support@apextradingcompanystore.co.in"/);
  assert.match(html, />support@apextradingcompanystore.co.in<\/a>/);
  assert.match(html, /overflow-wrap:anywhere/);
  const subject = 'Academy & course enquiry?';
  assert.ok(renderToStaticMarkup(React.createElement(email.default, { subject })).includes(`?subject=${encodeURIComponent(subject)}`));
});

test('Academy shows all six confirmed offerings immediately without inventing enrollment data', () => {
  const page = compile('app/academy/page.tsx', {
    'next/link': link,
    '@/components/AcademyOfferings': offerings,
    '@/services/api': { api: { get() { throw new Error('Must not fetch while rendering'); } } },
    '@/services/razorpay': { loadRazorpay() { throw new Error('Must not start checkout'); } },
    '@/services/checkoutPolicy': { canUseServiceCheckout: () => false },
    '@/store/useAppStore': { useAppStore: selector => selector({ user: null }) }
  });
  const html = renderToStaticMarkup(React.createElement(page.default));
  for (const title of ['Competitive Exam Courses', 'Spoken English', 'Spoken Hindi', 'Computer Course', 'Web Development', 'Coding']) {
    assert.ok(html.includes(title), title);
  }
  assert.equal((html.match(/<li /g) || []).length, 6);
  assert.match(html, /Online &amp; Offline/);
  assert.match(html, /mailto:support@apextradingcompanystore.co.in\?subject=APEX%20Academy%20course%20enquiry/);
  assert.match(html, /https:\/\/www.youtube.com\/@APEXGROUPS/);
  assert.doesNotMatch(html, /Enroll: INR|No published courses|enrolled successfully|100% Placement/);
});

test('support and all shared policy pages expose the public email without signing in', () => {
  const support = compile('app/support/page.tsx', {
    '@/components/PolicyPage': policy,
    '@/components/SupportForm': { default: () => React.createElement('p', null, 'Support request form') }
  });
  const html = renderToStaticMarkup(React.createElement(support.default));
  assert.match(html, /mailto:support@apextradingcompanystore.co.in/);
  assert.match(html, /https:\/\/wa.me\/919494273763/);
  assert.match(html, /Support request form/);
  const home = fs.readFileSync(path.join(__dirname, '../src/app/page.tsx'), 'utf8');
  assert.match(home, /<SupportEmailLink className="col-span-2/);
});
