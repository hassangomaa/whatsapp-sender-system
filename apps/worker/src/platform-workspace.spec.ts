import { prisma } from '@whatsapp-sender/database';
import { isPlatformWorkspace, isUnlimitedWorkspace, resetPlatformWorkspaceCacheForTests } from './platform-workspace';

jest.mock('@whatsapp-sender/database', () => ({
  prisma: {
    workspace: {
      findUnique: jest.fn(),
    },
  },
}));

describe('platform-workspace', () => {
  afterEach(() => {
    resetPlatformWorkspaceCacheForTests();
    jest.clearAllMocks();
    delete process.env.PLATFORM_ADMIN_EMAILS;
  });

  it('isPlatformWorkspace matches cached platform id', async () => {
    const configJson = JSON.stringify({
      platformWorkspaceId: 'ws-platform',
      otpSessionId: null,
      adminNotifySessionId: null,
      adminPhone: '966508334708',
      adminNotifyEnabled: true,
    });
    const redis = { get: jest.fn().mockResolvedValue(configJson) };

    await expect(isPlatformWorkspace('ws-platform', redis)).resolves.toBe(true);
    await expect(isPlatformWorkspace('ws-other', redis)).resolves.toBe(false);
  });

  it('isUnlimitedWorkspace true for admin-owned workspace', async () => {
    process.env.PLATFORM_ADMIN_EMAILS = 'admin@test.com';
    const configJson = JSON.stringify({
      platformWorkspaceId: 'ws-platform',
      otpSessionId: null,
      adminNotifySessionId: null,
      adminPhone: '966508334708',
      adminNotifyEnabled: true,
    });
    const redis = { get: jest.fn().mockResolvedValue(configJson) };
    (prisma.workspace.findUnique as jest.Mock).mockResolvedValue({
      id: 'ws-personal',
      owner: { email: 'admin@test.com' },
    });

    await expect(isUnlimitedWorkspace('ws-personal', redis)).resolves.toBe(true);
  });

  it('isUnlimitedWorkspace false for non-admin workspace', async () => {
    process.env.PLATFORM_ADMIN_EMAILS = 'admin@test.com';
    const redis = { get: jest.fn().mockResolvedValue(null) };
    (prisma.workspace.findUnique as jest.Mock).mockResolvedValue({
      id: 'ws-client',
      owner: { email: 'client@test.com' },
    });

    await expect(isUnlimitedWorkspace('ws-client', redis)).resolves.toBe(false);
  });
});
