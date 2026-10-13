const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
test('privacy and deletion resources are public without making private routes public', () => {
  const source = read('src/config/publicPaths.ts');
  assert.match(source, /includes\(path\.replace/);
  assert.doesNotMatch(source, /startsWith/);
  for (const route of ['privacy', 'terms', 'refunds', 'safety', 'support', 'account-deletion']) assert.ok(fs.existsSync(path.join(__dirname, '../src/app', route, 'page.tsx')));
  assert.match(read('src/context/AuthContext.tsx'), /!isPublicInformationPath\(pathname\)/);
  assert.match(read('src/components/GlobalModals.tsx'), /href="\/account-deletion"/);
});
test('deletion is an authenticated tracked request and never presents a request receipt as completed deletion', () => {
  const source = read('src/components/SupportForm.tsx');
  assert.match(source, /isAuthenticated/);
  assert.match(source, /api.post\('\/support\/requests'/);
  assert.match(source, /Support must process it before your account is deleted/);
  assert.doesNotMatch(source, /Account deleted successfully/);
});
test('production property, academy and store pages do not invent inventory or learning progress', () => {
  assert.match(read('src/app/realty/page.tsx'), /api.get\('\/realty\/property\/all'\)/);
  assert.doesNotMatch(read('src/app/realty/page.tsx'), /mockProperties|Over 10,000/);
  assert.doesNotMatch(read('src/app/academy/page.tsx'), /Sarah Jenkins|65%|100% Placement/);
  assert.match(read('src/app/academy/page.tsx'), /\/academy\/enrollments/);
  assert.doesNotMatch(read('src/app/store/page.tsx'), /Levi|Nike|onChange=\{\(\) => \{\}\}/);
  assert.match(read('src/app/store/[category]/page.tsx'), /await params/);
});
test('native push cannot register against a silently mismatched Firebase project', () => {
  assert.match(read('src/hooks/usePushNotifications.ts'), /NEXT_PUBLIC_NATIVE_PUSH_ENABLED !== 'true'/);
  assert.match(read('android/app/build.gradle'), /project_info.project_id != 'apex-5b654'/);
  assert.match(read('android/app/src/main/AndroidManifest.xml'), /allowBackup="false"/);
  assert.match(read('capacitor.config.ts'), /hostname: 'www.apextc.shop'/);
});
