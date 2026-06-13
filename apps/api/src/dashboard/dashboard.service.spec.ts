import { DashboardService } from './dashboard.service';

describe('DashboardService', () => {
  const prisma = {
    whatsappSession: { findMany: jest.fn() },
    subscription: { findUnique: jest.fn() },
    message: { findFirst: jest.fn(), findMany: jest.fn() },
    webhookDelivery: { findMany: jest.fn(), count: jest.fn() },
  };

  const usage = {
    getUsage: jest.fn().mockResolvedValue({
      messagesSent: 5,
      messageLimit: 30,
      remaining: 25,
      maxSessions: 1,
      planName: 'Trial',
    }),
  };

  const sessionLive = {
    filterLive: jest.fn().mockResolvedValue(new Set(['s1'])),
  };

  const service = new DashboardService(
    { client: prisma } as never,
    usage as never,
    sessionLive as never,
  );

  beforeEach(() => jest.clearAllMocks());

  it('returns extended dashboard stats', async () => {
    prisma.whatsappSession.findMany.mockResolvedValue([
      { id: 's1', name: 'Main', status: 'CONNECTED' },
    ]);
    prisma.subscription.findUnique.mockResolvedValue(null);
    prisma.message.findFirst.mockResolvedValue({ id: 'm1' });
    prisma.message.findMany.mockResolvedValue([
      {
        id: 'm1',
        phoneNumber: '201200000000',
        content: 'Hi',
        status: 'SENT',
        createdAt: new Date('2026-01-01'),
        session: { name: 'Main' },
      },
    ]);
    prisma.webhookDelivery.findMany.mockResolvedValue([
      { success: true },
      { success: false },
    ]);
    prisma.webhookDelivery.count.mockResolvedValue(1);

    const stats = await service.getStats('ws-1');

    expect(stats.planName).toBe('Trial');
    expect(stats.maxSessions).toBe(1);
    expect(stats.sessionsUsed).toBe(1);
    expect(stats.recentMessages).toHaveLength(1);
    expect(stats.webhookStats.failed).toBe(1);
    expect(stats.funnel.sessionConnected).toBe(true);
  });
});
