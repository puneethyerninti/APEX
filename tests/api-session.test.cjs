const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
function load(file, deps) {
  const mod = new Module(__filename);
  mod.require = name => Object.hasOwn(deps, name) ? deps[name] : require(name);
  mod._compile(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/services/' + file + '.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
  }).outputText, __filename);
  return mod.exports;
}
function fixture() {
  let generation = 1, user = { uid: 'account-a' }, saved = 0, serverResolve;
  const identity = { uid: 'firebase-a', async getIdToken() { return 'proof-a'; } };
  const auth = { currentUser: identity };
  let request, success, failure;
  class Cancelled extends Error { constructor(message) { super(message); this.cancelled = true; } }
  const instance = { defaults: { baseURL: 'https://test/api' }, interceptors: {
    request: { use(callback) { request = callback; } }, response: { use(ok, fail) { success = ok; failure = fail; } }
  }, request: async config => { await request(config); return { retried: true }; } };
  const axios = { create: () => instance, CanceledError: Cancelled, isCancel: error => error.cancelled,
    post: () => new Promise(resolve => serverResolve = resolve) };
  let release;
  let readiness = Promise.resolve(true);
  load('api', { axios: { ...axios, default: axios }, '@/firebase.config': { auth },
    '@/store/useAppStore': { useAppStore: { getState: () => ({ user }) } },
    './sessionReadiness': { waitForSessionReadiness: () => readiness, settleSessionReadiness() {} },
    './applicationSession': { sessionGeneration: () => generation, applyApplicationSession() { saved++; }, clearApplicationSession() { generation++; user = null; } }
  });
  return { request, success, failure, auth, identity, get saved() { return saved; },
    hold() { readiness = new Promise(resolve => release = resolve); }, release() { release(true); },
    switchAccount() { generation++; user = { uid: 'account-b' }; auth.currentUser = { uid: 'firebase-b' }; },
    respond() { serverResolve({ data: { token: 'session-a', user: { _id: 'account-a', name: 'Saved Name' } } }); }
  };
}
async function withBrowser(work) {
  const old = { window: global.window, localStorage: global.localStorage };
  global.window = { dispatchEvent() {} }; global.localStorage = { getItem: () => 'old-session' };
  try { await work(); } finally { global.window = old.window; global.localStorage = old.localStorage; }
}
test('queued private request from an old account cannot resume under a new account', () => withBrowser(async () => {
  const f = fixture(); f.hold(); const pending = f.request({ url: '/user/profile', headers: {} });
  f.switchAccount(); f.release(); await assert.rejects(pending, /Sign-in changed/);
}));
test('late private response is discarded after sign-out or an account switch', () => withBrowser(async () => {
  const f = fixture(); const config = await f.request({ url: '/user/profile', headers: {} }); f.switchAccount();
  assert.throws(() => f.success({ config, data: { name: 'Old Name' } }), /Sign-in changed/);
}));
test('late refresh cannot attach an old account token to a new account', () => withBrowser(async () => {
  const f = fixture(); const config = await f.request({ url: '/user/profile', headers: {} });
  const recovery = f.failure({ config, response: { status: 401 } });
  await new Promise(resolve => setImmediate(resolve)); f.switchAccount(); f.respond();
  await assert.rejects(recovery, /Sign-in changed/); assert.equal(f.saved, 0);
}));
test('concurrent expired-session requests share one refresh and preserve the account identity', () => withBrowser(async () => {
  const f = fixture();
  const a = await f.request({ url: '/user/profile', headers: {} }), b = await f.request({ url: '/finance/wallet', headers: {} });
  const recoveries = [f.failure({ config: a, response: { status: 401 } }), f.failure({ config: b, response: { status: 401 } })];
  await new Promise(resolve => setImmediate(resolve)); f.respond();
  const results = await Promise.all(recoveries); assert.equal(f.saved, 1); assert.ok(results.every(result => result.retried));
}));
