import { NotFoundException } from '@nestjs/common';
import { SessionStatus } from '@whatsapp-sender/database';
import { encryptApiKey } from '@whatsapp-sender/contracts';
import { SessionsService } from './sessions.service';

describe('SessionsService', () => {
  const prisma = {
    whatsappSession: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const initQueue = { add: jest.fn() };
  const disconnectQueue = { add: jest.fn() };
  const sessionLive = {
    isLive: jest.fn().mockResolvedValue(false),
    filterLive: jest.fn().mockResolvedValue(new Set<string>()),
  };

  const service = new SessionsService(
    { client: prisma } as never,
    sessionLive as never,
    initQueue as never,
    disconnectQueue as never,
  );

  beforeEach(() => jest.clearAllMocks());

  it('lists sessions for workspace', async () => {
    prisma.whatsappSession.findMany.mockResolvedValue([
      {
        id: 's1',
        name: 'POS',
        phone: null,
        status: SessionStatus.DISCONNECTED,
        apiKeyPrefix: null,
        apiKeyEncrypted: null,
        scopeSend: true,
        scopeMedia: false,
        scopeWebhook: false,
        webhookUrl: null,
        qrCode: null,
        lastConnectedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const rows = await service.list('ws-1');
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe('disconnected');
    expect(rows[0].hasApiKey).toBe(false);
    expect(rows[0].canSendMessages).toBe(false);
  });

  it('creates session without api key', async () => {
    prisma.whatsappSession.create.mockResolvedValue({
      id: 's1',
      name: 'POS',
      phone: null,
      status: SessionStatus.DISCONNECTED,
      apiKeyPrefix: null,
      apiKeyEncrypted: null,
      scopeSend: true,
      scopeMedia: true,
      scopeWebhook: true,
      webhookUrl: null,
      qrCode: null,
      lastConnectedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const created = await service.create('ws-1', 'POS');
    expect((created as { apiKey?: string }).apiKey).toBeUndefined();
    expect(created.hasApiKey).toBe(false);
    expect(prisma.whatsappSession.create).toHaveBeenCalledWith({
      data: {
        workspaceId: 'ws-1',
        name: 'POS',
        status: SessionStatus.DISCONNECTED,
      },
    });
  });

  it('throws when session not found', async () => {
    prisma.whatsappSession.findFirst.mockResolvedValue(null);
    await expect(service.get('ws-1', 'missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('init queues QR generation', async () => {
    prisma.whatsappSession.findFirst.mockResolvedValue({
      id: 's1',
      workspaceId: 'ws-1',
      status: SessionStatus.DISCONNECTED,
    });
    prisma.whatsappSession.update.mockResolvedValue({});

    const result = await service.init('ws-1', 's1');
    expect(result.status).toBe('qr_pending');
    expect(initQueue.add).toHaveBeenCalledWith('init', { sessionId: 's1' });
  });

  it('init skips when already connecting', async () => {
    prisma.whatsappSession.findFirst.mockResolvedValue({
      id: 's1',
      workspaceId: 'ws-1',
      status: SessionStatus.CONNECTING,
    });

    const result = await service.init('ws-1', 's1');
    expect(result.status).toBe('connecting');
    expect(initQueue.add).not.toHaveBeenCalled();
  });

  it('disconnect clears session state and api key', async () => {
    prisma.whatsappSession.findFirst.mockResolvedValue({ id: 's1', workspaceId: 'ws-1' });
    prisma.whatsappSession.update.mockResolvedValue({});

    const result = await service.disconnect('ws-1', 's1');
    expect(result.status).toBe('disconnected');
    expect(prisma.whatsappSession.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          disconnectRequestedAt: expect.any(Date),
          apiKeyHash: null,
          apiKeyPrefix: null,
          apiKeyEncrypted: null,
        }),
      }),
    );
    expect(disconnectQueue.add).toHaveBeenCalledWith('disconnect', { sessionId: 's1' });
  });

  it('issueApiKey generates key when connected', async () => {
    prisma.whatsappSession.findUnique.mockResolvedValue({
      id: 's1',
      status: SessionStatus.CONNECTED,
      apiKeyHash: null,
    });
    prisma.whatsappSession.update.mockResolvedValue({});

    const key = await service.issueApiKey('s1');
    expect(key).toMatch(/^sk_live_/);
    expect(prisma.whatsappSession.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          apiKeyEncrypted: expect.any(String),
        }),
      }),
    );
  });

  it('returns decrypted apiKey when encrypted value is stored', async () => {
    const plainKey = 'sk_live_testkey1234567890abcdef';
    process.env.API_KEY_ENCRYPTION_SECRET = 'test-encryption-secret-min-32-chars';
    prisma.whatsappSession.findFirst.mockResolvedValue({
      id: 's1',
      name: 'POS',
      phone: '201234567890',
      status: SessionStatus.CONNECTED,
      apiKeyPrefix: plainKey.slice(0, 16),
      apiKeyEncrypted: encryptApiKey(plainKey),
      scopeSend: true,
      scopeMedia: true,
      scopeWebhook: false,
      webhookUrl: null,
      qrCode: null,
      lastConnectedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const row = await service.get('ws-1', 's1');
    expect(row.apiKey).toBe(plainKey);
  });
});
