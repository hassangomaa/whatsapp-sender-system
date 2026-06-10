import { Injectable } from '@nestjs/common';
import { MessageStatus, SessionStatus } from '@whatsapp-sender/database';
import { PrismaService } from '../prisma/prisma.service';
import { UsageService } from '../common/usage.service';

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usage: UsageService,
  ) {}

  async getStats(workspaceId: string) {
    const [sessions, subscription, usage, firstMessage] = await Promise.all([
      this.prisma.client.whatsappSession.findMany({ where: { workspaceId } }),
      this.prisma.client.subscription.findUnique({
        where: { workspaceId },
        include: { plan: true },
      }),
      this.usage.getUsage(workspaceId),
      this.prisma.client.message.findFirst({
        where: { workspaceId, status: MessageStatus.SENT },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    const connected = sessions.filter((s) => s.status === SessionStatus.CONNECTED);

    return {
      totalSessions: sessions.length,
      connectedSessions: connected.length,
      connectionHealthPercent:
        sessions.length === 0 ? 0 : Math.round((connected.length / sessions.length) * 100),
      activePackages: subscription?.active ? 1 : 0,
      messagesSent: usage.messagesSent,
      trialRemaining: usage.remaining,
      trialUsed: usage.messagesSent,
      trialLimit: usage.messageLimit,
      funnel: {
        sessionCreated: sessions.length > 0,
        sessionConnected: connected.length > 0,
        firstMessageSent: Boolean(firstMessage),
        connectedSession: connected[0] ?? null,
      },
      recommendedAction:
        usage.remaining <= 0
          ? 'Activate a package to unlock more messages.'
          : connected.length === 0
            ? 'Create a session and scan the QR code.'
            : 'Send your first message or start a bulk campaign.',
    };
  }
}
