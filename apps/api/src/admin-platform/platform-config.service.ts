import { Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { DEFAULT_ADMIN_PHONE, PlatformConfigCache, REDIS_KEYS } from '@whatsapp-sender/contracts';
import { PrismaService } from '../prisma/prisma.service';

const PLATFORM_ID = 'platform';

@Injectable()
export class PlatformConfigService {
  private readonly redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379');

  constructor(private readonly prisma: PrismaService) {}

  async getSettings() {
    return this.ensureRow();
  }

  async getConfig(): Promise<PlatformConfigCache> {
    const row = await this.ensureRow();
    const config = this.rowToCache(row);
    await this.publishCache(config);
    return config;
  }

  async updateSettings(data: {
    otpSessionId?: string | null;
    adminNotifySessionId?: string | null;
    adminPhone?: string | null;
    adminNotifyEnabled?: boolean;
  }) {
    const row = await this.ensureRow();
    const updated = await this.prisma.client.platformSettings.update({
      where: { id: row.id },
      data: {
        ...(data.otpSessionId !== undefined ? { otpSessionId: data.otpSessionId } : {}),
        ...(data.adminNotifySessionId !== undefined
          ? { adminNotifySessionId: data.adminNotifySessionId }
          : {}),
        ...(data.adminPhone !== undefined ? { adminPhone: data.adminPhone } : {}),
        ...(data.adminNotifyEnabled !== undefined
          ? { adminNotifyEnabled: data.adminNotifyEnabled }
          : {}),
      },
    });
    const config = this.rowToCache(updated);
    await this.publishCache(config);
    return updated;
  }

  async ensurePlatformWorkspace(adminUserId: string) {
    const row = await this.ensureRow();
    if (row.platformWorkspaceId) {
      return row.platformWorkspaceId;
    }

    const existing = await this.prisma.client.workspace.findFirst({
      where: { ownerId: adminUserId, name: 'Platform' },
    });
    if (existing) {
      await this.prisma.client.platformSettings.update({
        where: { id: PLATFORM_ID },
        data: { platformWorkspaceId: existing.id },
      });
      await this.publishCacheFromRow({ ...row, platformWorkspaceId: existing.id });
      return existing.id;
    }

    const trialPlan = await this.prisma.client.plan.findUnique({ where: { slug: 'trial' } });
    const workspace = await this.prisma.client.workspace.create({
      data: {
        name: 'Platform',
        ownerId: adminUserId,
        members: { create: { userId: adminUserId, role: 'owner' } },
        settings: { create: {} },
        usage: {
          create: {
            messagesSent: 0,
            messageLimit: trialPlan?.messageLimit ?? 30,
          },
        },
        ...(trialPlan
          ? { subscription: { create: { planId: trialPlan.id, active: true } } }
          : {}),
      },
    });

    await this.prisma.client.platformSettings.update({
      where: { id: PLATFORM_ID },
      data: { platformWorkspaceId: workspace.id },
    });
    await this.publishCacheFromRow({ ...row, platformWorkspaceId: workspace.id });
    return workspace.id;
  }

  async validateSessionInPlatformWorkspace(sessionId: string, platformWorkspaceId: string) {
    const session = await this.prisma.client.whatsappSession.findFirst({
      where: { id: sessionId, workspaceId: platformWorkspaceId },
    });
    return session ?? null;
  }

  async getPlatformWorkspaceId(): Promise<string | null> {
    const row = await this.ensureRow();
    return row.platformWorkspaceId;
  }

  async isPlatformWorkspace(workspaceId: string): Promise<boolean> {
    const platformId = await this.getPlatformWorkspaceId();
    return Boolean(platformId && platformId === workspaceId);
  }

  private async ensureRow() {
    const existing = await this.prisma.client.platformSettings.findUnique({
      where: { id: PLATFORM_ID },
    });
    if (existing) {
      if (!existing.adminPhone) {
        const updated = await this.prisma.client.platformSettings.update({
          where: { id: existing.id },
          data: { adminPhone: this.defaultAdminPhone() },
        });
        await this.publishCache(this.rowToCache(updated));
        return updated;
      }
      if (!existing.otpSessionId && !existing.adminNotifySessionId) {
        return this.seedFromEnv(existing.id);
      }
      return existing;
    }

    return this.prisma.client.platformSettings.create({
      data: {
        id: PLATFORM_ID,
        otpSessionId: process.env.OTP_SESSION_ID?.trim() || null,
        adminNotifySessionId:
          process.env.ADMIN_NOTIFY_SESSION_ID?.trim() ||
          process.env.OTP_SESSION_ID?.trim() ||
          null,
        adminPhone: process.env.ADMIN_PHONE?.trim() || DEFAULT_ADMIN_PHONE,
        adminNotifyEnabled: process.env.ADMIN_NOTIFY_ENABLED !== '0',
      },
    });
  }

  private defaultAdminPhone() {
    return process.env.ADMIN_PHONE?.trim() || DEFAULT_ADMIN_PHONE;
  }

  private async seedFromEnv(id: string) {
    const updated = await this.prisma.client.platformSettings.update({
      where: { id },
      data: {
        otpSessionId: process.env.OTP_SESSION_ID?.trim() || null,
        adminNotifySessionId:
          process.env.ADMIN_NOTIFY_SESSION_ID?.trim() ||
          process.env.OTP_SESSION_ID?.trim() ||
          null,
        adminPhone: this.defaultAdminPhone(),
        adminNotifyEnabled: process.env.ADMIN_NOTIFY_ENABLED !== '0',
      },
    });
    await this.publishCache(this.rowToCache(updated));
    return updated;
  }

  private publishCacheFromRow(row: {
    platformWorkspaceId: string | null;
    otpSessionId: string | null;
    adminNotifySessionId: string | null;
    adminPhone: string | null;
    adminNotifyEnabled: boolean;
  }) {
    return this.publishCache(this.rowToCache(row));
  }

  private rowToCache(row: {
    platformWorkspaceId?: string | null;
    otpSessionId: string | null;
    adminNotifySessionId: string | null;
    adminPhone: string | null;
    adminNotifyEnabled: boolean;
  }): PlatformConfigCache {
    return {
      platformWorkspaceId: row.platformWorkspaceId ?? null,
      otpSessionId: row.otpSessionId,
      adminNotifySessionId: row.adminNotifySessionId,
      adminPhone: row.adminPhone ?? DEFAULT_ADMIN_PHONE,
      adminNotifyEnabled: row.adminNotifyEnabled,
    };
  }

  async publishCache(config: PlatformConfigCache) {
    await this.redis.set(REDIS_KEYS.platformConfig, JSON.stringify(config));
  }
}

export function isPlatformAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const allowlist = (process.env.PLATFORM_ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (allowlist.length === 0) return false;
  return allowlist.includes(email.toLowerCase());
}
