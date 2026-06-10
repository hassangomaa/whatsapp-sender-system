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
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [sessions, subscription, usage, firstMessage, recentMessages, webhookDeliveries, recentFailures] =
      await Promise.all([
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
        this.prisma.client.message.findMany({
          where: { workspaceId },
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: { session: { select: { name: true } } },
        }),
        this.prisma.client.webhookDelivery.findMany({
          where: { workspaceId },
          select: { success: true },
        }),
        this.prisma.client.webhookDelivery.count({
          where: { workspaceId, success: false, createdAt: { gte: since24h } },
        }),
      ]);

    const connected = sessions.filter((s) => s.status === SessionStatus.CONNECTED);
    const webhookSuccess = webhookDeliveries.filter((d) => d.success).length;
    const webhookFailed = webhookDeliveries.length - webhookSuccess;

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
      planName: usage.planName,
      maxSessions: usage.maxSessions,
      sessionsUsed: sessions.length,
      recentWebhookFailures: recentFailures,
      webhookStats: {
        total: webhookDeliveries.length,
        success: webhookSuccess,
        failed: webhookFailed,
      },
      recentMessages: recentMessages.map((m) => ({
        id: m.id,
        phoneNumber: m.phoneNumber,
        content: m.content,
        status: m.status,
        createdAt: m.createdAt.toISOString(),
        session: { name: m.session.name },
      })),
      funnel: {
        sessionCreated: sessions.length > 0,
        sessionConnected: connected.length > 0,
        firstMessageSent: Boolean(firstMessage),
        connectedSession: connected[0]
          ? { id: connected[0].id, name: connected[0].name, status: connected[0].status.toLowerCase() }
          : null,
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
