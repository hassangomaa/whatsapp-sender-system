import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { generateApiKey, hashApiKey, QUEUES } from '@whatsapp-sender/contracts';
import { SessionStatus } from '@whatsapp-sender/database';
import { PrismaService } from '../prisma/prisma.service';
import { SessionLiveService } from '../common/session-live.service';

@Injectable()
export class SessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionLive: SessionLiveService,
    @InjectQueue(QUEUES.SESSION_INIT) private readonly initQueue: Queue,
    @InjectQueue(QUEUES.SESSION_DISCONNECT) private readonly disconnectQueue: Queue,
  ) {}

  async list(workspaceId: string) {
    const sessions = await this.prisma.client.whatsappSession.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
    });
    const liveIds = await this.sessionLive.filterLive(sessions.map((s) => s.id));
    return sessions.map((s) => this.toPublicSession(s, liveIds.has(s.id)));
  }

  async get(workspaceId: string, id: string) {
    const session = await this.findSession(workspaceId, id);
    const liveConnected = await this.sessionLive.isLive(session.id);
    return this.toPublicSession(session, liveConnected);
  }

  async create(workspaceId: string, name: string) {
    const session = await this.prisma.client.whatsappSession.create({
      data: {
        workspaceId,
        name,
        status: SessionStatus.DISCONNECTED,
      },
    });
    return this.toPublicSession(session, false);
  }

  async init(workspaceId: string, id: string) {
    const session = await this.findSession(workspaceId, id);
    if (session.status === SessionStatus.CONNECTING) {
      return { status: 'connecting', message: 'Pairing in progress' };
    }
    await this.prisma.client.whatsappSession.update({
      where: { id: session.id },
      data: { status: SessionStatus.QR_PENDING, qrCode: null, disconnectRequestedAt: null },
    });
    await this.initQueue.add('init', { sessionId: id });
    return { status: 'qr_pending', message: 'QR generation started' };
  }

  async disconnect(workspaceId: string, id: string) {
    await this.findSession(workspaceId, id);
    await this.prisma.client.whatsappSession.update({
      where: { id },
      data: {
        disconnectRequestedAt: new Date(),
        status: SessionStatus.DISCONNECTED,
        qrCode: null,
        phone: null,
        apiKeyHash: null,
        apiKeyPrefix: null,
      },
    });
    await this.disconnectQueue.add('disconnect', { sessionId: id });
    return { status: 'disconnected' };
  }

  async updateScopes(
    workspaceId: string,
    id: string,
    scopes: { send?: boolean; media?: boolean; webhook?: boolean; webhookUrl?: string },
  ) {
    await this.findSession(workspaceId, id);
    return this.prisma.client.whatsappSession.update({
      where: { id },
      data: {
        scopeSend: scopes.send,
        scopeMedia: scopes.media,
        scopeWebhook: scopes.webhook,
        webhookUrl: scopes.webhookUrl,
      },
    });
  }

  async findByApiKey(apiKey: string) {
    const hash = hashApiKey(apiKey);
    return this.prisma.client.whatsappSession.findFirst({
      where: { apiKeyHash: hash },
      include: { workspace: { include: { usage: true } } },
    });
  }

  async issueApiKey(sessionId: string) {
    const session = await this.prisma.client.whatsappSession.findUnique({
      where: { id: sessionId },
    });
    if (!session || session.status !== SessionStatus.CONNECTED) {
      return null;
    }
    if (session.apiKeyHash) {
      return null;
    }
    const { key, prefix, hash } = generateApiKey();
    await this.prisma.client.whatsappSession.update({
      where: { id: sessionId },
      data: { apiKeyHash: hash, apiKeyPrefix: prefix },
    });
    return key;
  }

  private async findSession(workspaceId: string, id: string) {
    const session = await this.prisma.client.whatsappSession.findFirst({
      where: { id, workspaceId },
    });
    if (!session) {
      throw new NotFoundException('Session not found');
    }
    return session;
  }

  private toPublicSession(
    session: {
      id: string;
      name: string;
      phone: string | null;
      status: SessionStatus;
      apiKeyPrefix: string | null;
      scopeSend: boolean;
      scopeMedia: boolean;
      scopeWebhook: boolean;
      webhookUrl: string | null;
      qrCode: string | null;
      lastConnectedAt: Date | null;
      createdAt: Date;
      updatedAt: Date;
    },
    liveConnected: boolean,
  ) {
    const hasApiKey = Boolean(session.apiKeyPrefix);
    const dbConnected = session.status === SessionStatus.CONNECTED;
    return {
      id: session.id,
      name: session.name,
      phone: session.phone,
      status: session.status.toLowerCase(),
      liveConnected,
      apiKeyPrefix: session.apiKeyPrefix,
      hasApiKey,
      scopes: {
        send: session.scopeSend,
        media: session.scopeMedia,
        webhook: session.scopeWebhook,
      },
      webhookUrl: session.webhookUrl,
      qrCode: session.qrCode,
      lastConnectedAt: session.lastConnectedAt,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      canSendMessages: liveConnected && session.scopeSend,
    };
  }
}
