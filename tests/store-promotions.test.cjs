const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

const source = fs.readFileSync('src/components/StorePromotions.tsx', 'utf8');
const mod = new Module(__filename); mod.paths = module.paths;
mod._compile(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 } }).outputText, __filename);

test('slideshow renders all three supplied posters, uncropped, with stable sizing and accessible controls', () => {
  const { default: Component, storePromotions } = mod.exports;
  assert.equal(storePromotions.length, 3);
  for (const poster of storePromotions) assert.ok(fs.statSync('public' + poster.src).size > 0);
  const html = renderToStaticMarkup(React.createElement(Component));
  assert.equal((html.match(/aria-roledescription="slide"/g) || []).length, 3);
  assert.equal((html.match(/aria-hidden="true" class="absolute/g) || []).length, 2);
  assert.match(html, /object-contain/); assert.match(html, /h-64/); assert.match(html, /md:h-80/);
  assert.match(html, /style="object-fit:contain"/);
  for (const label of ['Previous advertisement', 'Next advertisement', 'Show advertisement 3', 'Pause slideshow']) assert.ok(html.includes(label));
});
test('home places advertisements below Store and removes only the specified property showcase', () => {
  const home = fs.readFileSync('src/app/page.tsx', 'utf8');
  assert.ok(home.indexOf('TOP HIGHLIGHT: APEX STORE') < home.indexOf('<StorePromotions />'));
  assert.ok(home.indexOf('<StorePromotions />') < home.indexOf('Flipkart-style Categories Compact Grid'));
  assert.doesNotMatch(home, /Premium Real Estate|Simplex Property|The Crown Villas|Skyline Penthouses|APEX Tech Park|realty-carousel-track|realtyTimer/);
  assert.match(home, /href="\/realty"/); assert.match(home, /academyTimer/); assert.match(home, /primeTimer/);
  assert.doesNotMatch(home, /<section id="travels"/);
  assert.match(home, /href="\/travels"/);
  assert.match(home, /<section id="prime"/);
});

test('autoplay, visibility, pause, reduced motion, swipe and timer cleanup behave correctly', () => {
  const slots = [], dependencies = [], cleanups = [], effects = [], timers = new Map();
  let cursor = 0, nextTimer = 0, reduced = false, listener;
  const old = { window: global.window, document: global.document, setInterval: global.setInterval, clearInterval: global.clearInterval };
  global.window = { matchMedia: () => ({ get matches() { return reduced; }, addEventListener: (_, fn) => { listener = fn; }, removeEventListener: () => { listener = undefined; } }) };
  global.document = { hidden: false };
  global.setInterval = (fn, delay) => { assert.equal(delay, 5000); timers.set(++nextTimer, fn); return nextTimer; };
  global.clearInterval = id => timers.delete(id);
  const hooks = {
    useState(initial) { const index = cursor++; if (!(index in slots)) slots[index] = initial;
      return [slots[index], value => { slots[index] = typeof value === 'function' ? value(slots[index]) : value; }]; },
    useRef(initial) { const index = cursor++; return slots[index] ||= { current: initial }; },
    useEffect(work, deps) { const index = cursor++; if (!dependencies[index] || deps.some((value, i) => value !== dependencies[index][i])) {
      dependencies[index] = deps; effects.push(() => { cleanups[index]?.(); cleanups[index] = work(); });
    } },
  };
  try {
    const isolated = new Module(__filename); isolated.paths = module.paths;
    isolated.require = name => name === 'react' ? hooks : require(name);
    isolated._compile(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 } }).outputText, __filename);
    const render = () => { cursor = 0; const tree = isolated.exports.default(); while (effects.length) effects.shift()(); return tree; };
    const tick = () => { for (const fn of timers.values()) fn(); };
    let tree = render(); assert.equal(timers.size, 1); tick(); assert.equal(slots[0], 1);
    global.document.hidden = true; tick(); assert.equal(slots[0], 1); global.document.hidden = false;
    tree.props.onMouseEnter(); tree = render(); assert.equal(timers.size, 0);
    tree.props.onMouseLeave(); tree = render(); assert.equal(timers.size, 1);
    tree.props.onFocusCapture(); tree = render(); assert.equal(timers.size, 0);
    tree.props.onBlurCapture({ currentTarget: { contains: () => false }, relatedTarget: null }); tree = render(); assert.equal(timers.size, 1);
    const controls = tree.props.children[1].props.children;
    controls[1].props.onClick(); tree = render(); assert.equal(timers.size, 0);
    tree.props.children[1].props.children[1].props.onClick(); tree = render(); assert.equal(timers.size, 1);
    reduced = true; listener(); tree = render(); assert.equal(timers.size, 0);
    const viewport = tree.props.children[0];
    viewport.props.onTouchStart({ touches: [{ clientX: 250 }] });
    viewport.props.onTouchEnd({ changedTouches: [{ clientX: 100 }] }); assert.equal(slots[0], 2);
    viewport.props.onTouchStart({ touches: [{ clientX: 100 }] });
    viewport.props.onTouchCancel(); viewport.props.onTouchEnd({ changedTouches: [{ clientX: 250 }] }); assert.equal(slots[0], 2);
    for (const cleanup of cleanups) cleanup?.(); assert.equal(timers.size, 0); assert.equal(listener, undefined);
  } finally { Object.assign(global, old); }
});
