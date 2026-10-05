const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function checkoutFixture() {
  const scripts = [];
  const window = { setTimeout() { return 1; }, clearTimeout() {} };
  const document = { createElement() { return { remove() {} }; }, head: { appendChild(script) { scripts.push(script); } } };
  const exports = {};
  const source = fs.readFileSync(require('node:path').join(__dirname, '../src/services/razorpay.ts'), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } });
  vm.runInNewContext(compiled.outputText, { exports, window, document, Promise, Error });
  return { load: exports.loadRazorpay, window, scripts };
}
test('checkout waits for the script and shares concurrent loads', async () => {
  const fixture = checkoutFixture();
  const first = fixture.load(); const second = fixture.load();
  assert.equal(first, second); assert.equal(fixture.scripts.length, 1);
  fixture.window.Razorpay = function Checkout() {};
  fixture.scripts[0].onload();
  assert.equal(await first, fixture.window.Razorpay);
});
test('failed script load can be retried', async () => {
  const fixture = checkoutFixture();
  const failed = fixture.load(); fixture.scripts[0].onerror();
  await assert.rejects(failed, /could not load/);
  const retry = fixture.load(); assert.equal(fixture.scripts.length, 2);
  fixture.window.Razorpay = function Checkout() {};
  fixture.scripts[1].onload(); assert.equal(await retry, fixture.window.Razorpay);
});
test('already available checkout does not inject another script', async () => {
  const fixture = checkoutFixture(); fixture.window.Razorpay = function Checkout() {};
  assert.equal(await fixture.load(), fixture.window.Razorpay);
  assert.equal(fixture.scripts.length, 0);
});
