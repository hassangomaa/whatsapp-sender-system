import { PlatformConfigService, isPlatformAdminEmail } from './platform-config.service';

describe('PlatformConfigService', () => {
  const redis = { set: jest.fn().mockResolvedValue('OK') };
  const platformRow = {
    id: 'platform',
    platformWorkspaceId: 'ws-1',
    otpSessionId: 'sess-otp',
    adminNotifySessionId: 'sess-admin',
    adminPhone: '966508334708',
    adminNotifyEnabled: true,
    updatedAt: new Date(),
  };

  const prisma = {
    client: {
      platformSettings: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      workspace: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      plan: { findUnique: jest.fn().mockResolvedValue({ id: 'plan-1', messageLimit: 30 }) },
      whatsappSession: { findFirst: jest.fn() },
    },
  };

  let service: PlatformConfigService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PlatformConfigService({ client: prisma.client } as never);
    (service as unknown as { redis: typeof redis }).redis = redis;
  });

  it('getConfig publishes cache from DB row', async () => {
    prisma.client.platformSettings.findUnique.mockResolvedValue(platformRow);
    const config = await service.getConfig();
    expect(config.otpSessionId).toBe('sess-otp');
    expect(config.platformWorkspaceId).toBe('ws-1');
    expect(redis.set).toHaveBeenCalled();
  });

  it('updateSettings writes DB and Redis', async () => {
    prisma.client.platformSettings.findUnique.mockResolvedValue(platformRow);
    prisma.client.platformSettings.update.mockResolvedValue({
      ...platformRow,
      otpSessionId: 'new-otp',
    });
    await service.updateSettings({ otpSessionId: 'new-otp' });
    expect(prisma.client.platformSettings.update).toHaveBeenCalled();
    expect(redis.set).toHaveBeenCalled();
  });

  it('ensurePlatformWorkspace reuses existing Platform workspace', async () => {
    prisma.client.platformSettings.findUnique.mockResolvedValue({
      ...platformRow,
      platformWorkspaceId: null,
    });
    prisma.client.workspace.findFirst.mockResolvedValue({ id: 'existing-ws' });
    prisma.client.platformSettings.update.mockResolvedValue({
      ...platformRow,
      platformWorkspaceId: 'existing-ws',
    });
    const id = await service.ensurePlatformWorkspace('user-1');
    expect(id).toBe('existing-ws');
  });

  it('isUnlimitedWorkspace for platform workspace id', async () => {
    prisma.client.platformSettings.findUnique.mockResolvedValue(platformRow);
    await expect(service.isUnlimitedWorkspace('ws-1')).resolves.toBe(true);
  });

  it('isUnlimitedWorkspace for admin-owned workspace', async () => {
    prisma.client.platformSettings.findUnique.mockResolvedValue(platformRow);
    process.env.PLATFORM_ADMIN_EMAILS = 'admin@test.com';
    prisma.client.workspace.findUnique.mockResolvedValue({
      id: 'ws-personal',
      owner: { email: 'admin@test.com' },
    });
    await expect(service.isUnlimitedWorkspace('ws-personal')).resolves.toBe(true);
  });

  it('isUnlimitedWorkspace false for regular client workspace', async () => {
    prisma.client.platformSettings.findUnique.mockResolvedValue(platformRow);
    process.env.PLATFORM_ADMIN_EMAILS = 'admin@test.com';
    prisma.client.workspace.findUnique.mockResolvedValue({
      id: 'ws-client',
      owner: { email: 'client@test.com' },
    });
    await expect(service.isUnlimitedWorkspace('ws-client')).resolves.toBe(false);
  });
});

describe('isPlatformAdminEmail', () => {
  const original = process.env.PLATFORM_ADMIN_EMAILS;

  afterEach(() => {
    process.env.PLATFORM_ADMIN_EMAILS = original;
  });

  it('returns true for allowlisted email', () => {
    process.env.PLATFORM_ADMIN_EMAILS = 'admin@test.com, other@test.com';
    expect(isPlatformAdminEmail('Admin@Test.com')).toBe(true);
  });

  it('returns false when not allowlisted', () => {
    process.env.PLATFORM_ADMIN_EMAILS = 'admin@test.com';
    expect(isPlatformAdminEmail('user@test.com')).toBe(false);
  });
});
