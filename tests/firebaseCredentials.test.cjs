const { test } = require('node:test');
const assert = require('node:assert/strict');
const { generateKeyPairSync, createPrivateKey } = require('node:crypto');
const { parseFirebaseCredentials } = require('../dist/services/firebaseCredentials');
const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048, privateKeyEncoding: { type: 'pkcs8', format: 'pem' }, publicKeyEncoding: { type: 'spki', format: 'pem' } });
const account = { project_id: 'test-fixture', client_email: 'fixture@test-fixture.iam.gserviceaccount.com', private_key: privateKey };
test('complete raw and base64 service account JSON produce the same valid RSA key', () => {
  const json = JSON.stringify(account);
  for (const value of [json, Buffer.from(json).toString('base64'), JSON.stringify(json)]) {
    const parsed = parseFirebaseCredentials(value, 'test-fixture');
    assert.equal(parsed.projectId, 'test-fixture'); assert.equal(createPrivateKey(parsed.privateKey).asymmetricKeyType, 'rsa');
  }
});
test('single/double escaped newlines, CRLF and flattened PEM are normalized safely', () => {
  for (const key of [privateKey.replace(/\n/g, '\\n'), privateKey.replace(/\n/g, '\\\\n'), privateKey.replace(/\n/g, '\\r\\n'), privateKey.replace(/\n/g, ''), privateKey.replace(/\n/g, '\r\n')]) {
    assert.equal(createPrivateKey(parseFirebaseCredentials(JSON.stringify({ ...account, private_key: key })).privateKey).asymmetricKeyType, 'rsa');
  }
});
test('truncated or fabricated keys fail closed without leaking input', () => {
  for (const value of ['not-json', JSON.stringify({ ...account, private_key: 'SECRET-FIXTURE-INCOMPLETE' }), JSON.stringify({ ...account, private_key: '-----BEGIN PRIVATE KEY-----AAAA-----END PRIVATE KEY-----' })]) {
    assert.throws(() => parseFirebaseCredentials(value), error => error.code === 'FIREBASE_CREDENTIAL_INVALID' && !error.message.includes('SECRET-FIXTURE'));
  }
});
test('credential for a different Firebase project is rejected', () => {
  assert.throws(() => parseFirebaseCredentials(JSON.stringify(account), 'different-project'), error => error.code === 'FIREBASE_PROJECT_MISMATCH');
});
