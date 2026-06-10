import { ForbiddenException } from '@nestjs/common';
import { UsageService } from './usage.service';

describe('UsageService', () => {
  const prisma = {
    usageCounter: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    subscription: {
      findUnique: jest.fn(),
    },
    whatsappSession: {
      count: jest.fn(),
    },
  };

  const service = new UsageService({ client: prisma } as never);

  beforeEach(() => jest.clearAllMocks());

  it('returns remaining quota', async () => {
    prisma.usageCounter.findUnique.mockResolvedValue({
      messagesSent: 10,
      messageLimit: 30,
    });
    const usage = await service.getUsage('ws-1');
    expect(usage.remaining).toBe(20);
  });

  it('throws when quota exhausted', async () => {
    prisma.usageCounter.findUnique.mockResolvedValue({
      messagesSent: 30,
      messageLimit: 30,
    });
    await expect(service.assertCanSend('ws-1')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('blocks session creation when at plan limit', async () => {
    prisma.subscription.findUnique.mockResolvedValue({
      plan: { maxSessions: 1 },
    });
    prisma.whatsappSession.count.mockResolvedValue(1);
    await expect(service.assertCanCreateSession('ws-1')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows session creation under limit', async () => {
    prisma.subscription.findUnique.mockResolvedValue({
      plan: { maxSessions: 3 },
    });
    prisma.whatsappSession.count.mockResolvedValue(2);
    await expect(service.assertCanCreateSession('ws-1')).resolves.toBeUndefined();
  });
});
