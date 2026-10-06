const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
test('registration name is transient and bound to the OTP-verified phone', () => {
  const exports = {};
  const source = fs.readFileSync(require('node:path').join(__dirname, '../src/services/loginDraft.ts'), 'utf8');
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, { exports });
  exports.setLoginDraft('New Member', '+919000000001');
  assert.equal(exports.getLoginDraftName('+919000000001'), 'New Member');
  assert.equal(exports.getLoginDraftName('+919000000002'), undefined);
  assert.equal(exports.getLoginDraftName(null), undefined);
  exports.clearLoginDraft();
  assert.equal(exports.getLoginDraftName('+919000000001'), undefined);
});
