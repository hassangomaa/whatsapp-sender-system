import { Injectable } from '@nestjs/common';
import { SessionStatus } from '@whatsapp-sender/database';
import { PrismaService } from '../prisma/prisma.service';
import { UsageService } from '../common/usage.service';

@Injectable()
export class StatusService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usage: UsageService,
  ) {}

  async getSummary(workspaceId: string) {
    const sessions = await this.prisma.client.whatsappSession.findMany({
      where: { workspaceId },
    });
    const usage = await this.usage.getUsage(workspaceId);
    const referral = await this.prisma.client.referralCode.findUnique({
      where: { workspaceId },
    });

    const connected = sessions.filter((s) => s.status === SessionStatus.CONNECTED);
    const webhookConfigured = sessions.filter((s) => s.webhookUrl && s.scopeWebhook);
    const quotaAlerts = sessions.filter(
      (s) => s.status === SessionStatus.CONNECTED && usage.remaining <= 0,
    ).length;

    return {
      connectedSessions: connected.length,
      totalSessions: sessions.length,
      webhookHealthy: webhookConfigured.filter((s) => s.webhookUrl).length,
      webhookTotal: sessions.length,
      quotaAlerts,
      trialRemaining: usage.remaining,
      trialUsed: usage.messagesSent,
      trialLimit: usage.messageLimit,
      referralCode: referral?.code ?? null,
      sessions: sessions.map((s) => ({
        id: s.id,
        name: s.name,
        phone: s.phone,
        status: s.status.toLowerCase(),
        webhookConfigured: Boolean(s.webhookUrl && s.scopeWebhook),
        quotaLabel: usage.remaining <= 0 ? 'exhausted' : 'trial',
        quotaUsed: usage.messagesSent,
        quotaLimit: usage.messageLimit,
      })),
      recommendedActions: this.buildRecommendations(sessions, usage.remaining),
    };
  }

  private buildRecommendations(
    sessions: { status: SessionStatus; webhookUrl: string | null; scopeWebhook: boolean }[],
    remaining: number,
  ) {
    const actions: string[] = [];
    if (!sessions.some((s) => s.status === SessionStatus.CONNECTED)) {
      actions.push('Create a session and scan the QR code to connect WhatsApp.');
    }
    if (sessions.some((s) => s.status === SessionStatus.CONNECTED && !s.webhookUrl)) {
      actions.push('Configure webhook URL on connected sessions for delivery events.');
    }
    if (remaining <= 0) {
      actions.push('Quota exhausted — activate a package or redeem a code.');
    }
    return actions;
  }
}
