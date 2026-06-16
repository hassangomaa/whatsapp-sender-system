import { decryptApiKey, encryptApiKey, generateApiKey } from './api-key';

describe('api-key crypto', () => {
  const originalSecret = process.env.API_KEY_ENCRYPTION_SECRET;

  beforeEach(() => {
    process.env.API_KEY_ENCRYPTION_SECRET = 'test-encryption-secret-min-32-chars';
  });

  afterEach(() => {
    if (originalSecret === undefined) {
      delete process.env.API_KEY_ENCRYPTION_SECRET;
    } else {
      process.env.API_KEY_ENCRYPTION_SECRET = originalSecret;
    }
  });

  it('round-trips encrypt and decrypt', () => {
    const { key } = generateApiKey();
    const encrypted = encryptApiKey(key);
    expect(encrypted).not.toContain(key);
    expect(decryptApiKey(encrypted)).toBe(key);
  });

  it('returns null for invalid payload', () => {
    expect(decryptApiKey('not-valid')).toBeNull();
    expect(decryptApiKey('a.b.c')).toBeNull();
  });

  it('returns null when secret changed', () => {
    const encrypted = encryptApiKey('sk_live_abc123');
    process.env.API_KEY_ENCRYPTION_SECRET = 'different-secret-min-32-characters';
    expect(decryptApiKey(encrypted)).toBeNull();
  });
});
