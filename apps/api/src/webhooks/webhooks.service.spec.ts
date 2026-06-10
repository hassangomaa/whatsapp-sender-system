import { WebhooksService } from './webhooks.service';

describe('WebhooksService', () => {
  const prisma = {
    webhookDelivery: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    whatsappSession: { findFirst: jest.fn() },
  };

  const webhook = { enqueueDelivery: jest.fn() };
  const settings = {
    get: jest.fn().mockResolvedValue({
      workspace: { defaultWebhookUrl: 'https://example.com/hook' },
    }),
  };

  const service = new WebhooksService(
    { client: prisma } as never,
    webhook as never,
    settings as never,
  );

  beforeEach(() => jest.clearAllMocks());

  it('lists deliveries for workspace', async () => {
    prisma.webhookDelivery.findMany.mockResolvedValue([{ id: 'd1' }]);
    const rows = await service.listDeliveries('ws-1', 10, 'failed');
    expect(rows).toHaveLength(1);
    expect(prisma.webhookDelivery.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { workspaceId: 'ws-1', success: false } }),
    );
  });

  it('retries a failed delivery', async () => {
    prisma.webhookDelivery.findFirst.mockResolvedValue({
      id: 'd1',
      workspaceId: 'ws-1',
      sessionId: 's1',
      messageId: 'm1',
      event: 'message.sent',
      url: 'https://example.com',
      payload: { event: 'message.sent' },
    });

    await service.retryDelivery('ws-1', 'd1');
    expect(webhook.enqueueDelivery).toHaveBeenCalledWith(
      expect.objectContaining({ deliveryId: 'd1', event: 'message.sent' }),
    );
  });
});
