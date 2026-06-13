import { Injectable } from '@nestjs/common';
import { MessageStatus, SessionStatus } from '@whatsapp-sender/database';
import { PrismaService } from '../prisma/prisma.service';
import { UsageService } from '../common/usage.service';
import { SessionLiveService } from '../common/session-live.service';

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usage: UsageService,
    private readonly sessionLive: SessionLiveService,
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

    const liveIds = await this.sessionLive.filterLive(sessions.map((s) => s.id));
    const dbConnected = sessions.filter((s) => s.status === SessionStatus.CONNECTED);
    const liveConnected = sessions.filter((s) => liveIds.has(s.id));
    const webhookSuccess = webhookDeliveries.filter((d) => d.success).length;
    const webhookFailed = webhookDeliveries.length - webhookSuccess;

    return {
      totalSessions: sessions.length,
      connectedSessions: dbConnected.length,
      liveConnectedSessions: liveConnected.length,
      connectionHealthPercent:
        sessions.length === 0 ? 0 : Math.round((liveConnected.length / sessions.length) * 100),
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
        sessionConnected: liveConnected.length > 0,
        firstMessageSent: Boolean(firstMessage),
        connectedSession: liveConnected[0]
          ? {
              id: liveConnected[0].id,
              name: liveConnected[0].name,
              status: liveConnected[0].status.toLowerCase(),
            }
          : null,
      },
      recommendedAction:
        usage.remaining <= 0
          ? 'Activate a package to unlock more messages.'
          : liveConnected.length === 0
            ? 'Create a session and scan the QR code.'
            : 'Send your first message or start a bulk campaign.',
    };
  }
}
