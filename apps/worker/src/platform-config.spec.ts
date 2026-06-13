import { REDIS_KEYS } from '@whatsapp-sender/contracts';
import {
  configFromEnv,
  loadPlatformConfig,
  parsePlatformConfig,
  resolveAdminPhone,
  resolveSessionId,
} from './platform-config';

describe('platform-config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.OTP_SESSION_ID;
    delete process.env.ADMIN_NOTIFY_SESSION_ID;
    delete process.env.ADMIN_PHONE;
    delete process.env.ADMIN_NOTIFY_ENABLED;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('configFromEnv reads env vars', () => {
    process.env.OTP_SESSION_ID = 'otp-1';
    process.env.ADMIN_NOTIFY_SESSION_ID = 'admin-1';
    process.env.ADMIN_PHONE = '966508334708';
    expect(configFromEnv()).toEqual({
      otpSessionId: 'otp-1',
      adminNotifySessionId: 'admin-1',
      adminPhone: '966508334708',
      adminNotifyEnabled: true,
    });
  });

  it('parsePlatformConfig handles invalid JSON', () => {
    expect(parsePlatformConfig('not-json')).toBeNull();
  });

  it('loadPlatformConfig prefers Redis cache', async () => {
    const redis = {
      get: jest.fn().mockResolvedValue(
        JSON.stringify({
          otpSessionId: 'cached-otp',
          adminNotifySessionId: 'cached-admin',
          adminPhone: '201000',
          adminNotifyEnabled: false,
        }),
      ),
    };
    const config = await loadPlatformConfig(redis);
    expect(config.otpSessionId).toBe('cached-otp');
    expect(redis.get).toHaveBeenCalledWith(REDIS_KEYS.platformConfig);
  });

  it('resolveSessionId falls back to env when cache missing', async () => {
    process.env.OTP_SESSION_ID = 'env-otp';
    const redis = { get: jest.fn().mockResolvedValue(null) };
    await expect(resolveSessionId('otp', redis)).resolves.toBe('env-otp');
  });

  it('resolveAdminPhone falls back to default', async () => {
    const redis = { get: jest.fn().mockResolvedValue(null) };
    await expect(resolveAdminPhone(redis)).resolves.toBe('201277785111');
  });
});
