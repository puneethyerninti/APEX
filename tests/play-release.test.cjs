const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.join(__dirname, '..');

test('release preflight fails before building when production or signing configuration is missing', { skip: process.platform !== 'win32' }, () => {
  const env = { ...process.env };
  for (const key of Object.keys(env)) if (/^(NEXT_PUBLIC_|APEX_)/.test(key)) delete env[key];
  const result = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', path.join(root, 'scripts/build-play-store.ps1'), '-VersionCode', '2', '-VersionName', '1.1.0', '-KeyStorePath', 'missing-test-key.jks'], { env, encoding: 'utf8' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Release configuration is missing/);
  assert.doesNotMatch(result.stdout, /Signed upload bundle/);
});

test('release configuration requires private signing and matching Play web assets, without committed keystores', () => {
  const gradle = fs.readFileSync(path.join(root, 'android/app/build.gradle'), 'utf8');
  assert.match(gradle, /APEX_STORE_PASSWORD/);
  assert.match(gradle, /No unsigned release is permitted/);
  assert.match(gradle, /marker\.distribution != 'google-play'/);
  assert.match(gradle, /marker\.versionCode != android\.defaultConfig\.versionCode/);
  const script = fs.readFileSync(path.join(root, 'scripts/build-play-store.ps1'), 'utf8');
  assert.ok(script.indexOf('npm.cmd run build') < script.indexOf('cap sync android'));
  assert.ok(script.indexOf('cap sync android') < script.indexOf('bundleRelease lintRelease'));
  assert.match(script, /NEXT_PUBLIC_DISTRIBUTION = 'google-play'/);
  const ignored = fs.readFileSync(path.join(root, '.gitignore'), 'utf8');
  assert.match(ignored, /\*\.jks/);
  assert.match(ignored, /\*\.keystore/);
});
