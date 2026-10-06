import { createPrivateKey } from 'crypto';

export function parseFirebaseCredentials(value: string, expectedProject?: string) {
  try {
    let text = value.trim().replace(/^\uFEFF/, '');
    // Render values may be raw JSON, base64 JSON, or a quoted JSON string.
    if (!text.startsWith('{') && !text.startsWith('"')) text = Buffer.from(text, 'base64').toString('utf8').trim();
    let account = JSON.parse(text);
    for (let i = 0; i < 2 && typeof account === 'string'; i++) account = JSON.parse(account);
    if (!account || typeof account !== 'object' || Array.isArray(account)) throw new Error();
    const projectId = account.project_id || account.projectId;
    const clientEmail = account.client_email || account.clientEmail;
    const rawKey = account.private_key || account.privateKey;
    if (typeof projectId !== 'string' || !projectId || typeof clientEmail !== 'string' || !clientEmail || typeof rawKey !== 'string') throw new Error();
    if (expectedProject && projectId !== expectedProject) throw Object.assign(new Error(), { credentialCode: 'FIREBASE_PROJECT_MISMATCH' });
    const key = rawKey.trim().replace(/^"|"$/g, '').replace(/\\+r\\+n|\\+n|\\+r/g, '\n').replace(/\r\n/g, '\n').trim();
    const match = key.match(/^-----BEGIN (PRIVATE KEY|RSA PRIVATE KEY)-----([\s\S]+)-----END \1-----$/);
    if (!match) throw new Error();
    const body = match[2].replace(/\s/g, '');
    if (!body || !/^[A-Za-z0-9+/]+={0,2}$/.test(body)) throw new Error();
    const privateKey = `-----BEGIN ${match[1]}-----\n${body.match(/.{1,64}/g)!.join('\n')}\n-----END ${match[1]}-----\n`;
    if (createPrivateKey(privateKey).asymmetricKeyType !== 'rsa') throw new Error();
    return { projectId, clientEmail, privateKey };
  } catch (error: any) {
    // Never include the JSON, PEM or provider error text in diagnostics.
    const code = error.credentialCode || 'FIREBASE_CREDENTIAL_INVALID';
    throw Object.assign(new Error(code === 'FIREBASE_PROJECT_MISMATCH' ? 'Firebase service account belongs to a different project.' : 'Firebase service account is invalid. Replace it with a complete Firebase-generated JSON key.'), { code });
  }
}
