const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const axios = require('axios');

test('real Axios multipart transport overrides the JSON default and includes the browser-compatible form boundary', async () => {
  let received;
  const server = http.createServer((request, response) => {
    const chunks = [];
    request.on('data', chunk => chunks.push(chunk));
    request.on('end', () => {
      received = { type: request.headers['content-type'], body: Buffer.concat(chunks).toString() };
      response.setHeader('Content-Type', 'application/json'); response.end('{"ok":true}');
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const body = new FormData();
    body.append('acceptedTerms', 'true'); body.append('retainedImages', '[]'); body.append('expectedReviewVersion', '0');
    body.append('images', new Blob(['test image bytes'], { type: 'image/jpeg' }), 'photo.jpg');
    const api = axios.create({ headers: { 'Content-Type': 'application/json' } });
    const result = await api.post('http://127.0.0.1:' + server.address().port, body, { headers: { 'Content-Type': undefined }, proxy: false });
    assert.equal(result.data.ok, true);
    assert.match(received.type, /^multipart\/form-data; boundary=\S+/);
    assert.match(received.body, /name="images"; filename="photo.jpg"/);
    assert.match(received.body, /name="retainedImages"/);
    assert.match(received.body, /name="expectedReviewVersion"/);
  } finally { await new Promise(resolve => server.close(resolve)); }
});

test('profile form waits for photo preparation, preserves edits on failure and version-checks the saved gallery', () => {
  const source = fs.readFileSync('src/app/matrimony/page.tsx', 'utf8');
  assert.match(source, /body.append\('retainedImages', JSON.stringify\(retainedPhotos\)\)/);
  assert.match(source, /body.append\('expectedReviewVersion', String\(editingVersion\)\)/);
  assert.match(source, /'Content-Type': undefined/);
  assert.match(source, /if \(!uid \|\| busy \|\| preparingPhotos \|\| saveController.current\) return/);
  assert.match(source, /catch \(e\) \{ if \(!controller.signal.aborted\) setFormError\(errorText\(e\)\)/);
  assert.match(source, /<MatrimonyPhotoEditor/);
  const admin = fs.readFileSync('src/app/admin-dashboard/page.tsx', 'utf8');
  assert.match(admin, /View full photo/);
  assert.match(admin, /className="relative"><MatrimonyImage/);
  assert.match(admin, /reviewVersion \|\| 0/);
  assert.match(admin, /whitespace-pre-wrap break-words text-gray-600">\{p.bio\}/);
});
