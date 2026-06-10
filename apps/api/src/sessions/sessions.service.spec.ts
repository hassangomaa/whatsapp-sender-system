import { NotFoundException } from '@nestjs/common';
import { SessionStatus } from '@whatsapp-sender/database';
import { SessionsService } from './sessions.service';

describe('SessionsService', () => {
  const prisma = {
    whatsappSession: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const initQueue = { add: jest.fn() };
  const disconnectQueue = { add: jest.fn() };

  const service = new SessionsService(
    { client: prisma } as never,
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
        apiKeyPrefix: 'sk_live',
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
    expect(rows[0].canSendMessages).toBe(false);
  });

  it('creates session with api key', async () => {
    prisma.whatsappSession.create.mockResolvedValue({
      id: 's1',
      name: 'POS',
      phone: null,
      status: SessionStatus.DISCONNECTED,
      apiKeyPrefix: 'sk_live',
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
    expect(created.apiKey).toMatch(/^sk_live_/);
    expect(prisma.whatsappSession.create).toHaveBeenCalled();
  });

  it('throws when session not found', async () => {
    prisma.whatsappSession.findFirst.mockResolvedValue(null);
    await expect(service.get('ws-1', 'missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('init queues QR generation', async () => {
    prisma.whatsappSession.findFirst.mockResolvedValue({ id: 's1', workspaceId: 'ws-1' });
    prisma.whatsappSession.update.mockResolvedValue({});

    const result = await service.init('ws-1', 's1');
    expect(result.status).toBe('qr_pending');
    expect(initQueue.add).toHaveBeenCalledWith('init', { sessionId: 's1' });
  });

  it('disconnect clears session state', async () => {
    prisma.whatsappSession.findFirst.mockResolvedValue({ id: 's1', workspaceId: 'ws-1' });
    prisma.whatsappSession.update.mockResolvedValue({});

    const result = await service.disconnect('ws-1', 's1');
    expect(result.status).toBe('disconnected');
    expect(disconnectQueue.add).toHaveBeenCalledWith('disconnect', { sessionId: 's1' });
  });
});
