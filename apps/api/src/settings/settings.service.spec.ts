import { SettingsService } from './settings.service';

describe('SettingsService', () => {
  const prisma = {
    user: { findUniqueOrThrow: jest.fn(), update: jest.fn() },
    workspace: { findFirst: jest.fn(), update: jest.fn() },
    workspaceSettings: { upsert: jest.fn() },
  };

  const service = new SettingsService({ client: prisma } as never);

  beforeEach(() => jest.clearAllMocks());

  it('returns user and workspace settings', async () => {
    prisma.user.findUniqueOrThrow.mockResolvedValue({ id: 'u1', email: 'a@b.com', name: 'Test', phone: null });
    prisma.workspace.findFirst.mockResolvedValue({
      id: 'w1',
      name: 'My Workspace',
      settings: { defaultWebhookUrl: 'https://hook.example.com' },
    });

    const result = await service.get('u1', 'w1');
    expect(result.workspace.defaultWebhookUrl).toBe('https://hook.example.com');
  });

  it('updates workspace name and webhook', async () => {
    prisma.workspace.findFirst
      .mockResolvedValueOnce({ id: 'w1', name: 'Old' })
      .mockResolvedValueOnce({
        id: 'w1',
        name: 'New',
        settings: { defaultWebhookUrl: 'https://x.com' },
      });
    prisma.user.findUniqueOrThrow.mockResolvedValue({ id: 'u1', email: 'a@b.com', name: 'Test', phone: null });

    const result = await service.update('u1', 'w1', {
      workspaceName: 'New',
      defaultWebhookUrl: 'https://x.com',
    });

    expect(prisma.workspace.update).toHaveBeenCalled();
    expect(prisma.workspaceSettings.upsert).toHaveBeenCalled();
    expect(result.workspace.name).toBe('New');
  });
});
