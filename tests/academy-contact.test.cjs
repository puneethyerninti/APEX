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
const catalog = compile('config/academyOfferings.ts');
const offerings = compile('components/AcademyOfferings.tsx', {
  '@/components/SupportEmailLink': email,
  '@/config/academyOfferings': catalog,
  './AcademyOfferings.module.css': { default: { rail: 'rail', card: 'course-card' } }
});
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
  assert.match(html, /mailto:support@apextradingcompanystore.co.in\?subject=APEX%20Academy%20enquiry%3A%20Spoken%20English/);
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

test('course cards have local photographs, full-course fees and individual enquiry links, not fake checkout', () => {
  const html = renderToStaticMarkup(React.createElement(offerings.default));
  assert.equal((html.match(/<article /g) || []).length, 6);
  assert.equal((html.match(/Full course/g) || []).length, 6);
  assert.equal((html.match(/<img /g) || []).length, 6);
  for (const course of catalog.academyOfferings) {
    assert.ok(Number.isInteger(course.fee) && course.fee > 0);
    const image = fs.readFileSync(path.join(__dirname, '../public', course.image));
    assert.equal(image.readUInt16BE(0), 0xffd8);
    assert.ok(image.length < 100000, 'Course photos must remain small enough for mobile');
    assert.ok(html.includes(course.fee.toLocaleString('en-IN')));
    assert.ok(html.includes(encodeURIComponent(`APEX Academy enquiry: ${course.title}`)));
  }
  for (const control of ['Previous course', 'Next course', 'Pause course auto-scroll']) assert.ok(html.includes(control));
  assert.doesNotMatch(html, /Buy Now|Enroll Now|payment confirmed|discount|\/finance\/razorpay/);
});

test('course carousel cycles, wraps and pauses for touch, focus, hover, visibility and reduced motion', () => {
  const slots = [], dependencies = [], cleanups = [], effects = [], timers = new Map();
  let cursor = 0, nextTimer = 0, reduced = false, mediaListener, observerCallback, disconnected = false;
  const calls = [];
  const old = { window: global.window, document: global.document, IntersectionObserver: global.IntersectionObserver, setInterval: global.setInterval, clearInterval: global.clearInterval };
  global.window = { IntersectionObserver: true, matchMedia: () => ({ get matches() { return reduced; }, addEventListener: (_, fn) => { mediaListener = fn; }, removeEventListener: () => { mediaListener = undefined; } }) };
  global.document = { hidden: false };
  global.IntersectionObserver = class {
    constructor(callback) { observerCallback = callback; }
    observe() { observerCallback([{ isIntersecting: true }]); }
    disconnect() { disconnected = true; }
  };
  global.setInterval = (fn, delay) => { assert.equal(delay, 5000); timers.set(++nextTimer, fn); return nextTimer; };
  global.clearInterval = id => timers.delete(id);
  const hooks = {
    useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = initial; return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }]; },
    useRef(initial) { const i = cursor++; return slots[i] ||= { current: initial }; },
    useCallback(fn) { cursor++; return fn; },
    useEffect(work, deps) { const i = cursor++; if (!dependencies[i] || deps.some((value, n) => value !== dependencies[i][n])) {
      dependencies[i] = deps; effects.push(() => { cleanups[i]?.(); cleanups[i] = work(); });
    } }
  };
  try {
    const component = compile('components/AcademyOfferings.tsx', {
      react: hooks, '@/components/SupportEmailLink': email, '@/config/academyOfferings': catalog,
      './AcademyOfferings.module.css': { default: { rail: 'rail', card: 'card' } }
    }).default;
    const list = { children: catalog.academyOfferings.map((_, i) => ({ offsetLeft: 16 + i * 248 })), scrollLeft: 0,
      scrollTo(options) { calls.push(options); this.scrollLeft = options.left; } };
    const render = () => {
      cursor = 0;
      const tree = component();
      tree.props.ref.current = {};
      tree.props.children[1].props.ref.current = list;
      while (effects.length) effects.shift()();
      return tree;
    };
    const tick = () => { for (const fn of [...timers.values()]) fn(); };
    let tree = render(); tree = render();
    assert.equal(timers.size, 1);
    tick(); tree = render(); assert.equal(slots[2], 1); assert.equal(calls.at(-1).behavior, 'smooth');
    global.document.hidden = true; tick(); assert.equal(slots[2], 1); global.document.hidden = false;
    tree.props.onMouseEnter(); tree = render(); assert.equal(timers.size, 0);
    tree.props.onMouseLeave(); tree = render(); assert.equal(timers.size, 1);
    tree.props.onFocusCapture(); tree = render(); assert.equal(timers.size, 0);
    tree.props.onBlurCapture({ currentTarget: { contains: () => true }, relatedTarget: {} }); tree = render(); assert.equal(timers.size, 0);
    tree.props.onBlurCapture({ currentTarget: { contains: () => false }, relatedTarget: null }); tree = render(); assert.equal(timers.size, 1);
    tree.props.children[1].props.onPointerDown(); tree = render(); assert.equal(timers.size, 0);
    const play = () => { tree.props.children[2].props.children[1].props.children[1].props.onClick(); tree = render(); };
    play(); assert.equal(timers.size, 1);
    observerCallback([{ isIntersecting: false }]); tree = render(); assert.equal(timers.size, 0);
    observerCallback([{ isIntersecting: true }]); tree = render(); assert.equal(timers.size, 1);
    reduced = true; mediaListener(); tree = render(); assert.equal(timers.size, 0);
    reduced = false; mediaListener(); tree = render(); assert.equal(timers.size, 1);
    const keyboard = key => { const ul = tree.props.children[1]; ul.props.onKeyDown({ key, target: list, currentTarget: list, preventDefault() {} }); tree = render(); };
    keyboard('End'); assert.equal(slots[2], 5); assert.equal(calls.at(-1).behavior, 'instant');
    play(); tick(); tree = render(); assert.equal(slots[2], 0); assert.equal(calls.at(-1).behavior, 'instant');
    const nav = tree.props.children[0].props.children[1].props.children;
    nav[0].props.onClick(); tree = render(); assert.equal(slots[2], 5);
    tree.props.children[0].props.children[1].props.children[1].props.onClick(); tree = render(); assert.equal(slots[2], 0);
    list.scrollLeft = 3 * 248; tree.props.children[1].props.onScroll(); tree = render(); assert.equal(slots[2], 3);
    keyboard('Home'); assert.equal(slots[2], 0);
    for (const cleanup of cleanups) cleanup?.();
    assert.equal(timers.size, 0); assert.equal(mediaListener, undefined); assert.equal(disconnected, true);
  } finally { Object.assign(global, old); }
});
