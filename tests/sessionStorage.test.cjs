const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
test('saved cookies cannot restore an identity or wallet before server verification', () => {
  let options;
  const source = fs.readFileSync(require('node:path').join(__dirname, '../src/store/useAppStore.ts'), 'utf8');
  const modules = {
    zustand: { create: () => value => value },
    'zustand/middleware': { persist: (state, config) => { options = config; return state; }, createJSONStorage: fn => fn() },
    'js-cookie': { default: {} }
  };
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, { exports: {}, require: key => modules[key] });
  const saved = { user: { uid: 'old-user', role: 'admin' }, walletBalance: 99999, cartCount: 3 };
  const current = { user: null, walletBalance: 0, cartCount: 0 };
  const merged = options.merge(saved, current);
  assert.equal(merged.user, null); assert.equal(merged.walletBalance, 0); assert.equal(merged.cartCount, 3);
  assert.deepEqual(Object.keys(options.partialize(saved)), ['cartCount']);
});
