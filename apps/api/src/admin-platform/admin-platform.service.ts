import { BadRequestException, Injectable } from '@nestjs/common';
import { SessionsService } from '../sessions/sessions.service';
import { OtpService } from '../auth/otp.service';
import { PrismaService } from '../prisma/prisma.service';
import { PlatformConfigService } from './platform-config.service';
import { UpdatePlatformSettingsDto } from './dto';

@Injectable()
export class AdminPlatformService {
  constructor(
    private readonly platformConfig: PlatformConfigService,
    private readonly sessions: SessionsService,
    private readonly otp: OtpService,
    private readonly prisma: PrismaService,
  ) {}

  async getPlatform(adminUserId: string) {
    const platformWorkspaceId = await this.platformConfig.ensurePlatformWorkspace(adminUserId);
    const settings = await this.platformConfig.getSettings();
    const sessions = await this.sessions.list(platformWorkspaceId);
    const workspace = await this.prisma.client.workspace.findUnique({
      where: { id: platformWorkspaceId },
    });

    const sessionById = new Map(sessions.map((s) => [s.id, s]));

    return {
      platformWorkspaceId,
      platformWorkspaceName: workspace?.name ?? 'Platform',
      otpSessionId: settings.otpSessionId,
      adminNotifySessionId: settings.adminNotifySessionId,
      adminPhone: settings.adminPhone,
      adminNotifyEnabled: settings.adminNotifyEnabled,
      otpSession: settings.otpSessionId
        ? sessionById.get(settings.otpSessionId) ?? null
        : null,
      adminNotifySession: settings.adminNotifySessionId
        ? sessionById.get(settings.adminNotifySessionId) ?? null
        : null,
      sessions,
    };
  }

  async listSessions(adminUserId: string) {
    const platformWorkspaceId = await this.platformConfig.ensurePlatformWorkspace(adminUserId);
    return this.sessions.list(platformWorkspaceId);
  }

  async updatePlatform(adminUserId: string, dto: UpdatePlatformSettingsDto) {
    const platformWorkspaceId = await this.platformConfig.ensurePlatformWorkspace(adminUserId);

    if (dto.otpSessionId) {
      const session = await this.platformConfig.validateSessionInPlatformWorkspace(
        dto.otpSessionId,
        platformWorkspaceId,
      );
      if (!session) {
        throw new BadRequestException('OTP session must belong to the platform workspace');
      }
    }

    if (dto.adminNotifySessionId) {
      const session = await this.platformConfig.validateSessionInPlatformWorkspace(
        dto.adminNotifySessionId,
        platformWorkspaceId,
      );
      if (!session) {
        throw new BadRequestException('Admin notify session must belong to the platform workspace');
      }
    }

    await this.platformConfig.updateSettings({
      otpSessionId: dto.otpSessionId,
      adminNotifySessionId: dto.adminNotifySessionId,
      adminPhone: dto.adminPhone,
      adminNotifyEnabled: dto.adminNotifyEnabled,
    });

    return this.getPlatform(adminUserId);
  }

  async testOtp(dto: { phone: string }) {
    return this.otp.requestOtp({ phone: dto.phone });
  }

  async createSession(adminUserId: string, name: string) {
    const platformWorkspaceId = await this.platformConfig.ensurePlatformWorkspace(adminUserId);
    return this.sessions.create(platformWorkspaceId, name);
  }

  async initSession(adminUserId: string, sessionId: string) {
    const platformWorkspaceId = await this.platformConfig.ensurePlatformWorkspace(adminUserId);
    const session = await this.platformConfig.validateSessionInPlatformWorkspace(
      sessionId,
      platformWorkspaceId,
    );
    if (!session) {
      throw new BadRequestException('Session not found in platform workspace');
    }
    return this.sessions.init(platformWorkspaceId, sessionId);
  }

  async getSession(adminUserId: string, sessionId: string) {
    const platformWorkspaceId = await this.platformConfig.ensurePlatformWorkspace(adminUserId);
    return this.sessions.get(platformWorkspaceId, sessionId);
  }
}
