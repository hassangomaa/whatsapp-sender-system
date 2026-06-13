import { ForbiddenException, Injectable } from '@nestjs/common';
import { formatAuditQuotaExhausted, formatAuditSessionLimit } from '@whatsapp-sender/contracts';
import { PrismaService } from '../prisma/prisma.service';
import { PlatformConfigService } from '../admin-platform/platform-config.service';
import { AdminNotifyService } from '../admin-notify/admin-notify.service';
import { AdminAuditService } from '../admin-notify/admin-audit.service';

const DEFAULT_TRIAL_LIMIT = 30;
const DEFAULT_MAX_SESSIONS = 1;

@Injectable()
export class UsageService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly adminNotify: AdminNotifyService,
    private readonly audit: AdminAuditService,
    private readonly platformConfig: PlatformConfigService,
  ) {}

  async getPlanLimits(workspaceId: string) {
    const subscription = await this.prisma.client.subscription.findUnique({
      where: { workspaceId },
      include: { plan: true },
    });
    return {
      messageLimit: subscription?.plan.messageLimit ?? DEFAULT_TRIAL_LIMIT,
      maxSessions: subscription?.plan.maxSessions ?? DEFAULT_MAX_SESSIONS,
      sendRateLimitMs: subscription?.plan.sendRateLimitMs ?? 3000,
      planName: subscription?.plan.name ?? 'Trial',
    };
  }

  async getUsage(workspaceId: string) {
    const usage = await this.prisma.client.usageCounter.findUnique({
      where: { workspaceId },
    });
    const limits = await this.getPlanLimits(workspaceId);
    const messageLimit = usage?.messageLimit ?? limits.messageLimit;
    return {
      messagesSent: usage?.messagesSent ?? 0,
      messageLimit,
      remaining: Math.max(0, messageLimit - (usage?.messagesSent ?? 0)),
      maxSessions: limits.maxSessions,
      planName: limits.planName,
    };
  }

  async assertCanSend(workspaceId: string) {
    if (await this.platformConfig.isPlatformWorkspace(workspaceId)) {
      return this.getUsage(workspaceId);
    }

    const usage = await this.getUsage(workspaceId);
    if (usage.remaining <= 0) {
      const ctx = await this.audit.loadContext(workspaceId);
      ctx.messagesUsed = usage.messagesSent;
      ctx.messageLimit = usage.messageLimit;
      ctx.planName = usage.planName;
      await this.adminNotify.notify({
        event: 'quota_exhausted',
        message: formatAuditQuotaExhausted(ctx),
        workspaceId,
        dedupeKey: `quota:${workspaceId}`,
      });
      throw new ForbiddenException({
        statusCode: 403,
        message: 'Quota exhausted. Activate a package or redeem a code.',
        error: 'quota_exhausted',
      });
    }
    return usage;
  }

  async assertCanCreateSession(workspaceId: string) {
    if (await this.platformConfig.isPlatformWorkspace(workspaceId)) {
      return;
    }

    const limits = await this.getPlanLimits(workspaceId);
    const count = await this.prisma.client.whatsappSession.count({
      where: { workspaceId },
    });
    if (count >= limits.maxSessions) {
      const ctx = await this.audit.loadContext(workspaceId);
      ctx.sessionsUsed = count;
      ctx.maxSessions = limits.maxSessions;
      ctx.planName = limits.planName;
      await this.adminNotify.notify({
        event: 'session_limit',
        message: formatAuditSessionLimit(ctx),
        workspaceId,
        dedupeKey: `session-limit:${workspaceId}`,
      });
      throw new ForbiddenException({
        statusCode: 403,
        message: `Session limit reached (${limits.maxSessions}). Upgrade your package.`,
        error: 'session_limit_reached',
      });
    }
  }

  async incrementUsage(workspaceId: string, count = 1) {
    if (await this.platformConfig.isPlatformWorkspace(workspaceId)) {
      return;
    }
    await this.prisma.client.usageCounter.upsert({
      where: { workspaceId },
      create: { workspaceId, messagesSent: count, messageLimit: 30 },
      update: { messagesSent: { increment: count } },
    });
  }

  async addBonus(workspaceId: string, bonus: number) {
    await this.prisma.client.usageCounter.upsert({
      where: { workspaceId },
      create: { workspaceId, messagesSent: 0, messageLimit: 30 + bonus },
      update: { messageLimit: { increment: bonus } },
    });
  }
}
