import { UnauthorizedException } from '@nestjs/common';
import { OtpService } from './otp.service';

describe('OtpService', () => {
  const redisStore = new Map<string, string>();

  const prisma = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    workspaceMember: { findFirst: jest.fn() },
  };

  const auth = {
    bootstrapWorkspaceForUser: jest.fn().mockResolvedValue({ id: 'ws-1' }),
    buildAuthResponse: jest.fn().mockReturnValue({ token: 'jwt', user: {}, workspaceId: 'ws-1' }),
  };

  const adminNotify = { notify: jest.fn(), formatRegister: jest.fn().mockReturnValue('msg') };
  const otpQueue = { add: jest.fn() };
  const jwt = { sign: jest.fn() };

  let service: OtpService;

  beforeEach(() => {
    jest.clearAllMocks();
    redisStore.clear();
    process.env.OTP_DEV_MODE = '1';

    service = new OtpService(
      { client: prisma } as never,
      jwt as never,
      auth as never,
      adminNotify as never,
      otpQueue as never,
    );

    const redis = {
      get: jest.fn((k: string) => Promise.resolve(redisStore.get(k) ?? null)),
      set: jest.fn((k: string, v: string) => {
        redisStore.set(k, v);
        return Promise.resolve('OK');
      }),
      del: jest.fn((k: string) => {
        redisStore.delete(k);
        return Promise.resolve(1);
      }),
    };
    (service as unknown as { redis: typeof redis }).redis = redis;
  });

  it('stores OTP on request in dev mode', async () => {
    const res = await service.requestOtp({ phone: '201277785111' });
    expect(res.ok).toBe(true);
    expect(redisStore.get('otp:201277785111')).toBe('123456');
  });

  it('rejects invalid verify code', async () => {
    redisStore.set('otp:201277785111', '123456');
    await expect(service.verifyOtp({ phone: '201277785111', code: '000000' })).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
