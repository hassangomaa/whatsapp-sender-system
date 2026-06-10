import { createHash, randomBytes } from 'crypto';

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

export function generateReferralCode(): string {
  return `WA${randomBytes(4).toString('hex').toUpperCase()}`;
}
