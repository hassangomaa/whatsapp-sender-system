import { getPlatformAdminEmails, isPlatformAdminEmail } from './platform-admin';

describe('platform-admin', () => {
  const original = process.env.PLATFORM_ADMIN_EMAILS;

  afterEach(() => {
    process.env.PLATFORM_ADMIN_EMAILS = original;
  });

  it('parses allowlist from env', () => {
    process.env.PLATFORM_ADMIN_EMAILS = 'Admin@Test.com, other@test.com';
    expect(getPlatformAdminEmails()).toEqual(['admin@test.com', 'other@test.com']);
  });

  it('matches allowlisted email case-insensitively', () => {
    process.env.PLATFORM_ADMIN_EMAILS = 'admin@test.com';
    expect(isPlatformAdminEmail('Admin@Test.com')).toBe(true);
    expect(isPlatformAdminEmail('other@test.com')).toBe(false);
  });
});
