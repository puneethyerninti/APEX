const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function fixture() {
  const exports = {};
  const source = fs.readFileSync(require('node:path').join(__dirname, '../src/services/sessionReadiness.ts'), 'utf8');
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, { exports, Promise });
  return exports;
}
test('requests wait for session completion without blocking layout rendering', async () => {
  const f = fixture(); let completed = false;
  const request = f.waitForSessionReadiness().then(value => { completed = true; return value; });
  await Promise.resolve(); assert.equal(completed, false);
  f.settleSessionReadiness(true); assert.equal(await request, true);
});
test('verification failure does not release authenticated requests', async () => {
  const f = fixture(); const request = f.waitForSessionReadiness();
  f.settleSessionReadiness(false); assert.equal(await request, false);
});
test('observer restart moves waiting requests to the current session', async () => {
  const f = fixture(); const request = f.waitForSessionReadiness();
  f.resetSessionReadiness(); f.settleSessionReadiness(true);
  assert.equal(await request, true);
});
test('a new account verification cannot use readiness from the old account', async () => {
  const f = fixture(); f.settleSessionReadiness(true); f.resetSessionReadiness();
  let completed = false;
  const request = f.waitForSessionReadiness().then(value => { completed = true; return value; });
  await Promise.resolve(); assert.equal(completed, false);
  f.settleSessionReadiness(false); assert.equal(await request, false);
});
