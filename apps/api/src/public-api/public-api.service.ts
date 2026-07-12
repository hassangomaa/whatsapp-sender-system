import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, QueueEvents } from 'bullmq';
import {
  MessageRecipient,
  QUEUES,
  RecipientKind,
  ResolvedChannelRecipient,
  ResolvedGroupRecipient,
  buildMessageJid,
  parseChannelInviteCode,
  parseGroupInviteCode,
  resolveChannelRecipient,
  resolveGroupRecipient,
  resolvePhoneRecipient,
  WhatsAppGroupInfo,
  WhatsAppNewsletterInfo,
} from '@whatsapp-sender/contracts';
import { ChatDirection, MessageStatus, Prisma, SessionStatus } from '@whatsapp-sender/database';
import { PrismaService } from '../prisma/prisma.service';
import { SessionsService } from '../sessions/sessions.service';
import { UsageService } from '../common/usage.service';

type SessionRow = Awaited<ReturnType<SessionsService['findByApiKey']>> & object;

@Injectable()
export class PublicApiService {
  private listGroupsEvents: QueueEvents | null = null;
  private joinGroupEvents: QueueEvents | null = null;
  private resolveNewsletterEvents: QueueEvents | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly sessions: SessionsService,
    private readonly usage: UsageService,
    @InjectQueue(QUEUES.SEND_MESSAGE) private readonly sendQueue: Queue,
    @InjectQueue(QUEUES.SESSION_LIST_GROUPS) private readonly listGroupsQueue: Queue,
    @InjectQueue(QUEUES.SESSION_JOIN_GROUP) private readonly joinGroupQueue: Queue,
    @InjectQueue(QUEUES.SESSION_RESOLVE_NEWSLETTER) private readonly resolveNewsletterQueue: Queue,
  ) {}

  async sendMessage(
    apiKey: string,
    idempotencyKey: string | undefined,
    payload: { phoneNumber: string; content: string },
  ) {
    const session = await this.resolveSession(apiKey, 'send');
    await this.usage.assertCanSend(session.workspaceId);

    const resolved = resolvePhoneRecipient(payload.phoneNumber);
    if (!resolved) {
      throw new BadRequestException('Provide a valid phoneNumber');
    }

    return this.enqueueMessage(session, resolved, payload.content, idempotencyKey);
  }

  async getMessage(apiKey: string, messageId: string) {
    const session = await this.resolveSession(apiKey, 'send');
    const message = await this.prisma.client.message.findFirst({
      where: { id: messageId, sessionId: session.id },
      select: {
        id: true,
        phoneNumber: true,
        status: true,
        errorMessage: true,
        externalId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    return {
      id: message.id,
      messageId: message.id,
      phoneNumber: message.phoneNumber,
      status: message.status,
      errorMessage: message.errorMessage,
      externalId: message.externalId,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
    };
  }

  /**
   * Chat history for the session — inbound + outbound messages the worker
   * captured from WhatsApp. Optionally filtered to a single chat (`chatJid`,
   * a group `...@g.us`, contact `...@s.whatsapp.net`, or `...@newsletter`) and
   * a direction. Cursor-paginated newest-first.
   */
  async listChatMessages(
    apiKey: string,
    opts: { chatJid?: string; direction?: 'inbound' | 'outbound'; limit?: number; cursor?: string },
  ) {
    const session = await this.resolveSession(apiKey, 'read');
    return this.listChatMessagesForSession(session, opts);
  }

  async listGroupMessages(
    apiKey: string,
    opts: {
      groupJid?: string;
      inviteCode?: string;
      direction?: 'inbound' | 'outbound';
      limit?: number;
      cursor?: string;
    },
  ) {
    const session = await this.resolveSession(apiKey, 'read');
    const resolved = resolveGroupRecipient({ groupJid: opts.groupJid, inviteCode: opts.inviteCode });
    if (!resolved) {
      throw new BadRequestException('Provide either groupJid or inviteCode (not both)');
    }

    const groupJid =
      resolved.recipient && resolved.recipient.length > 0
        ? resolved.recipient
        : await this.joinGroupForSession(session, resolved.inviteCode!);

    return this.listChatMessagesForSession(session, {
      chatJid: groupJid,
      direction: opts.direction,
      limit: opts.limit,
      cursor: opts.cursor,
    });
  }

  private async listChatMessagesForSession(
    session: SessionRow,
    opts: { chatJid?: string; direction?: 'inbound' | 'outbound'; limit?: number; cursor?: string },
  ) {
    const limit = this.normalizeLimit(opts.limit);
    const chatJid = opts.chatJid?.trim();

    const where: Prisma.ChatMessageWhereInput = { sessionId: session.id };
    if (chatJid) {
      where.chatJid = buildMessageJid(chatJid);
    }
    if (opts.direction === 'inbound') {
      where.direction = ChatDirection.INBOUND;
    } else if (opts.direction === 'outbound') {
      where.direction = ChatDirection.OUTBOUND;
    }

    const rows = await this.prisma.client.chatMessage.findMany({
      where,
      orderBy: [{ timestamp: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(opts.cursor ? { skip: 1, cursor: { id: opts.cursor } } : {}),
      select: {
        id: true,
        waMessageId: true,
        chatJid: true,
        senderJid: true,
        fromMe: true,
        direction: true,
        isGroup: true,
        pushName: true,
        messageType: true,
        content: true,
        mediaType: true,
        timestamp: true,
      },
    });

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;

    return {
      messages: page.map((m) => ({
        id: m.id,
        messageId: m.waMessageId,
        chatJid: m.chatJid,
        senderJid: m.senderJid,
        fromMe: m.fromMe,
        direction: m.direction.toLowerCase(),
        isGroup: m.isGroup,
        pushName: m.pushName,
        type: m.messageType,
        content: m.content,
        mediaType: m.mediaType,
        timestamp: m.timestamp,
      })),
      nextCursor: hasMore ? page[page.length - 1].id : null,
    };
  }

  /**
   * Overview of chats seen on the session — one entry per chat with its message
   * count and most recent activity, newest-active first.
   */
  async listChats(apiKey: string, opts: { limit?: number }) {
    const session = await this.resolveSession(apiKey, 'read');
    const limit = this.normalizeLimit(opts.limit);

    const grouped = await this.prisma.client.chatMessage.groupBy({
      by: ['chatJid', 'isGroup'],
      where: { sessionId: session.id },
      _count: { _all: true },
      _max: { timestamp: true },
      orderBy: { _max: { timestamp: 'desc' } },
      take: limit,
    });

    return {
      chats: grouped.map((g) => ({
        chatJid: g.chatJid,
        isGroup: g.isGroup,
        messageCount: g._count._all,
        lastMessageAt: g._max.timestamp,
      })),
    };
  }

  private normalizeLimit(limit?: number): number {
    if (typeof limit !== 'number' || !Number.isFinite(limit)) {
      return 50;
    }
    return Math.min(Math.max(Math.trunc(limit), 1), 200);
  }

  async sendGroupMessage(
    apiKey: string,
    idempotencyKey: string | undefined,
    payload: { groupJid?: string; inviteCode?: string; content: string },
  ) {
    const session = await this.resolveSession(apiKey, 'send');
    await this.usage.assertCanSend(session.workspaceId);

    const resolved = resolveGroupRecipient(payload);
    if (!resolved) {
      throw new BadRequestException('Provide either groupJid or inviteCode (not both)');
    }

    const recipient = await this.resolveGroupTarget(session, resolved);
    return this.enqueueMessage(
      session,
      { recipient, kind: 'group' },
      payload.content,
      idempotencyKey,
    );
  }

  async sendChannelMessage(
    apiKey: string,
    idempotencyKey: string | undefined,
    payload: { newsletterJid?: string; inviteCode?: string; content: string },
  ) {
    const session = await this.resolveSession(apiKey, 'send');
    await this.usage.assertCanSend(session.workspaceId);

    const resolved = resolveChannelRecipient(payload);
    if (!resolved) {
      throw new BadRequestException('Provide either newsletterJid or inviteCode (not both)');
    }

    const recipient = await this.resolveChannelTarget(session, resolved);
    return this.enqueueMessage(
      session,
      { recipient, kind: 'newsletter' },
      payload.content,
      idempotencyKey,
    );
  }

  async sendMedia(
    apiKey: string,
    idempotencyKey: string | undefined,
    payload: {
      phoneNumber: string;
      mediaType: string;
      mediaUrl?: string;
      caption?: string;
      file?: Express.Multer.File;
    },
  ) {
    const session = await this.resolveSession(apiKey, 'media');
    await this.usage.assertCanSend(session.workspaceId);

    const resolved = resolvePhoneRecipient(payload.phoneNumber);
    if (!resolved) {
      throw new BadRequestException('Provide a valid phoneNumber');
    }

    return this.enqueueMedia(session, resolved, payload, idempotencyKey);
  }

  async sendGroupMedia(
    apiKey: string,
    idempotencyKey: string | undefined,
    payload: {
      groupJid?: string;
      inviteCode?: string;
      mediaType: string;
      mediaUrl?: string;
      caption?: string;
      file?: Express.Multer.File;
    },
  ) {
    const session = await this.resolveSession(apiKey, 'media');
    await this.usage.assertCanSend(session.workspaceId);

    const resolved = resolveGroupRecipient(payload);
    if (!resolved) {
      throw new BadRequestException('Provide either groupJid or inviteCode (not both)');
    }

    const recipient = await this.resolveGroupTarget(session, resolved);
    return this.enqueueMedia(
      session,
      { recipient, kind: 'group' },
      payload,
      idempotencyKey,
    );
  }

  async sendChannelMedia(
    apiKey: string,
    idempotencyKey: string | undefined,
    payload: {
      newsletterJid?: string;
      inviteCode?: string;
      mediaType: string;
      mediaUrl?: string;
      caption?: string;
      file?: Express.Multer.File;
    },
  ) {
    const session = await this.resolveSession(apiKey, 'media');
    await this.usage.assertCanSend(session.workspaceId);

    const resolved = resolveChannelRecipient(payload);
    if (!resolved) {
      throw new BadRequestException('Provide either newsletterJid or inviteCode (not both)');
    }

    const recipient = await this.resolveChannelTarget(session, resolved);
    return this.enqueueMedia(
      session,
      { recipient, kind: 'newsletter' },
      payload,
      idempotencyKey,
    );
  }

  async listGroups(apiKey: string): Promise<{ groups: WhatsAppGroupInfo[] }> {
    const session = await this.resolveSession(apiKey, 'send');
    const events = this.getQueueEvents(QUEUES.SESSION_LIST_GROUPS, 'listGroupsEvents');
    const job = await this.listGroupsQueue.add(
      'list',
      { sessionId: session.id },
      { jobId: `list-groups-${session.id}-${Date.now()}` },
    );

    try {
      const groups = (await job.waitUntilFinished(events, 15_000)) as WhatsAppGroupInfo[];
      return { groups: groups ?? [] };
    } catch {
      throw new ServiceUnavailableException('Could not list groups — session may be offline');
    }
  }

  async joinGroup(apiKey: string, inviteCode: string): Promise<{ jid: string }> {
    const session = await this.resolveSession(apiKey, 'send');
    const jid = await this.joinGroupForSession(session, inviteCode);
    return { jid };
  }

  async resolveChannel(apiKey: string, inviteCode: string): Promise<{ channel: WhatsAppNewsletterInfo }> {
    const session = await this.resolveSession(apiKey, 'send');
    const channel = await this.resolveChannelForSession(session, inviteCode);
    return { channel };
  }

  private async enqueueMessage(
    session: SessionRow,
    resolved: MessageRecipient,
    content: string,
    idempotencyKey: string | undefined,
  ) {
    if (idempotencyKey) {
      const existing = await this.prisma.client.idempotencyRecord.findUnique({
        where: { key: idempotencyKey },
      });
      if (existing) {
        return existing.response as { id: string; messageId?: string };
      }
    }

    const message = await this.prisma.client.message.create({
      data: {
        workspaceId: session.workspaceId,
        sessionId: session.id,
        phoneNumber: resolved.recipient,
        content,
        status: MessageStatus.QUEUED,
        idempotencyKey: idempotencyKey ?? undefined,
      },
    });

    await this.sendQueue.add(
      'send',
      {
        messageId: message.id,
        sessionId: session.id,
        phoneNumber: resolved.recipient,
        content,
        recipientKind: resolved.kind,
      },
      { jobId: message.id },
    );

    const response = { id: message.id, messageId: message.id };
    if (idempotencyKey) {
      await this.prisma.client.idempotencyRecord.create({
        data: { key: idempotencyKey, response },
      });
    }

    return response;
  }

  private async enqueueMedia(
    session: SessionRow,
    resolved: MessageRecipient,
    payload: {
      mediaType: string;
      mediaUrl?: string;
      caption?: string;
      file?: Express.Multer.File;
    },
    idempotencyKey: string | undefined,
  ) {
    if (idempotencyKey) {
      const existing = await this.prisma.client.idempotencyRecord.findUnique({
        where: { key: idempotencyKey },
      });
      if (existing) {
        return existing.response as { id: string; messageId?: string };
      }
    }

    const message = await this.prisma.client.message.create({
      data: {
        workspaceId: session.workspaceId,
        sessionId: session.id,
        phoneNumber: resolved.recipient,
        content: payload.caption,
        mediaType: payload.mediaType,
        mediaUrl: payload.mediaUrl,
        status: MessageStatus.QUEUED,
        idempotencyKey: idempotencyKey ?? undefined,
      },
    });

    await this.sendQueue.add(
      'send-media',
      {
        messageId: message.id,
        sessionId: session.id,
        phoneNumber: resolved.recipient,
        mediaType: payload.mediaType,
        mediaUrl: payload.mediaUrl,
        mediaBase64: payload.file ? payload.file.buffer.toString('base64') : undefined,
        caption: payload.caption,
        recipientKind: resolved.kind as RecipientKind,
      },
      { jobId: message.id },
    );

    const response = { id: message.id, messageId: message.id };
    if (idempotencyKey) {
      await this.prisma.client.idempotencyRecord.create({
        data: { key: idempotencyKey, response },
      });
    }

    return response;
  }

  private async resolveGroupTarget(
    session: SessionRow,
    resolved: ResolvedGroupRecipient,
  ): Promise<string> {
    if (resolved.recipient) {
      return resolved.recipient;
    }
    return this.joinGroupForSession(session, resolved.inviteCode!);
  }

  private async resolveChannelTarget(
    session: SessionRow,
    resolved: ResolvedChannelRecipient,
  ): Promise<string> {
    if (resolved.recipient) {
      return resolved.recipient;
    }
    const channel = await this.resolveChannelForSession(session, resolved.inviteCode!);
    return channel.jid;
  }

  private async joinGroupForSession(session: SessionRow, inviteCode: string): Promise<string> {
    const code = parseGroupInviteCode(inviteCode);
    const events = this.getQueueEvents(QUEUES.SESSION_JOIN_GROUP, 'joinGroupEvents');
    const job = await this.joinGroupQueue.add(
      'join',
      { sessionId: session.id, inviteCode: code },
      { jobId: `join-group-${session.id}-${Date.now()}` },
    );

    try {
      const result = (await job.waitUntilFinished(events, 20_000)) as { jid: string };
      return result.jid;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'join failed';
      throw new ServiceUnavailableException(`Could not join group: ${message}`);
    }
  }

  private async resolveChannelForSession(
    session: SessionRow,
    inviteCode: string,
  ): Promise<WhatsAppNewsletterInfo> {
    const code = parseChannelInviteCode(inviteCode);
    const events = this.getQueueEvents(QUEUES.SESSION_RESOLVE_NEWSLETTER, 'resolveNewsletterEvents');
    const job = await this.resolveNewsletterQueue.add(
      'resolve',
      { sessionId: session.id, inviteCode: code },
      { jobId: `resolve-newsletter-${session.id}-${Date.now()}` },
    );

    try {
      return (await job.waitUntilFinished(events, 20_000)) as WhatsAppNewsletterInfo;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'resolve failed';
      throw new ServiceUnavailableException(`Could not resolve channel: ${message}`);
    }
  }

  private getQueueEvents(
    queueName: string,
    field: 'listGroupsEvents' | 'joinGroupEvents' | 'resolveNewsletterEvents',
  ): QueueEvents {
    if (!this[field]) {
      this[field] = new QueueEvents(queueName, {
        connection: { url: process.env.REDIS_URL ?? 'redis://localhost:6379' },
      });
    }
    return this[field]!;
  }

  private async resolveSession(apiKey: string | undefined, scope: 'send' | 'media' | 'read') {
    if (!apiKey) {
      throw new UnauthorizedException({
        statusCode: 401,
        message: 'Missing x-api-key',
        error: 'unauthorized',
      });
    }

    const session = await this.sessions.findByApiKey(apiKey);
    if (!session) {
      throw new UnauthorizedException({
        statusCode: 401,
        message: 'Invalid API key',
        error: 'unauthorized',
      });
    }

    if (session.status !== SessionStatus.CONNECTED) {
      throw new ServiceUnavailableException('Session is not connected');
    }

    if (scope === 'send' && !session.scopeSend) {
      throw new BadRequestException('Send scope disabled for this session');
    }
    if (scope === 'media' && !session.scopeMedia) {
      throw new BadRequestException('Media scope disabled for this session');
    }

    return session;
  }
}
