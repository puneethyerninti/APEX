const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function fixture() {
  const exports = {}, timers = new Map(), events = []; let timerId = 0;
  const source = fs.readFileSync(require('node:path').join(__dirname, '../src/services/sessionGate.ts'), 'utf8');
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, {
    exports, AbortController, Error, setTimeout(fn) { timers.set(++timerId, fn); return timerId; }, clearTimeout(id) { timers.delete(id); }
  });
  const gate = exports.createSessionGate({ loading: () => events.push('loading'), anonymous: () => events.push('anonymous'), verified: value => events.push(value), failed: error => events.push(error.message) });
  return { gate, events, expire() { const timer = [...timers.values()][0]; assert.ok(timer); timer(); } };
}
test('Firebase observer that never initializes exits loading with a retryable error', () => {
  const f = fixture(); f.expire(); assert.match(f.events[0], /longer than expected/); f.gate.dispose();
});
test('hung token/server request is aborted and late completion cannot authenticate', async () => {
  const f = fixture(); let resolve, signal;
  const run = f.gate.verify(s => { signal = s; return new Promise(r => resolve = r); });
  f.expire(); assert.equal(signal.aborted, true); resolve('late login'); await run;
  assert.equal(f.events.includes('late login'), false); f.gate.dispose();
});
test('sign-out invalidates any older verification response', async () => {
  const f = fixture(); let resolve;
  const run = f.gate.verify(() => new Promise(r => resolve = r));
  f.gate.anonymous(); resolve('stale login'); await run;
  assert.deepEqual(f.events, ['loading', 'anonymous']); f.gate.dispose();
});
test('retry can authenticate but the previous request cannot overwrite it', async () => {
  const f = fixture(); let resolve;
  const old = f.gate.verify(() => new Promise(r => resolve = r)); f.expire();
  await f.gate.verify(async () => 'verified'); resolve('stale'); await old;
  assert.equal(f.events.at(-1), 'verified'); assert.equal(f.events.includes('stale'), false); f.gate.dispose();
});
test('unmount stops deadlines and ignores outstanding responses', async () => {
  const f = fixture(); let resolve;
  const run = f.gate.verify(() => new Promise(r => resolve = r)); f.gate.dispose(); resolve('unmounted'); await run;
  assert.deepEqual(f.events, ['loading']);
});
