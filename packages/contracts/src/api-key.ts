import { createCipheriv, createDecipheriv, createHash, randomBytes, scryptSync } from 'crypto';

export function generateApiKey(): { key: string; prefix: string; hash: string } {
  const raw = randomBytes(32).toString('hex');
  const key = `sk_live_${raw}`;
  const prefix = key.slice(0, 16);
  const hash = hashApiKey(key);
  return { key, prefix, hash };
}

export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

function getEncryptionKey(): Buffer {
  const secret =
    process.env.API_KEY_ENCRYPTION_SECRET?.trim() ||
    process.env.JWT_SECRET?.trim() ||
    'dev-only-api-key-encryption-fallback';
  return scryptSync(secret, 'ws-api-key', 32);
}

export function encryptApiKey(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64url')}.${tag.toString('base64url')}.${encrypted.toString('base64url')}`;
}

export function decryptApiKey(payload: string): string | null {
  try {
    const parts = payload.split('.');
    if (parts.length !== 3) return null;
    const [ivB64, tagB64, dataB64] = parts;
    const iv = Buffer.from(ivB64, 'base64url');
    const tag = Buffer.from(tagB64, 'base64url');
    const data = Buffer.from(dataB64, 'base64url');
    const decipher = createDecipheriv('aes-256-gcm', getEncryptionKey(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
  } catch {
    return null;
  }
}

export function generateReferralCode(): string {
  return `WA${randomBytes(4).toString('hex').toUpperCase()}`;
}
