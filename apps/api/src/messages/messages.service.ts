import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { isValidPhone, normalizePhone, QUEUES } from '@whatsapp-sender/contracts';
import { MessageStatus, SessionStatus } from '@whatsapp-sender/database';
import { PrismaService } from '../prisma/prisma.service';
import { UsageService } from '../common/usage.service';

@Injectable()
export class MessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usage: UsageService,
    @InjectQueue(QUEUES.SEND_MESSAGE) private readonly sendQueue: Queue,
  ) {}

  async list(workspaceId: string, limit = 50, cursor?: string) {
    return this.prisma.client.message.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      ...(cursor
        ? { skip: 1, cursor: { id: cursor } }
        : {}),
      include: { session: { select: { id: true, name: true } } },
    });
  }

  async send(workspaceId: string, sessionId: string, phoneNumber: string, content: string) {
    await this.usage.assertCanSend(workspaceId);

    const session = await this.prisma.client.whatsappSession.findFirst({
      where: { id: sessionId, workspaceId },
    });
    if (!session || session.status !== SessionStatus.CONNECTED) {
      throw new ForbiddenException('Session not connected');
    }
    if (!isValidPhone(phoneNumber)) {
      throw new ForbiddenException('Invalid phone number');
    }

    const normalized = normalizePhone(phoneNumber);
    const message = await this.prisma.client.message.create({
      data: {
        workspaceId,
        sessionId,
        phoneNumber: normalized,
        content,
        status: MessageStatus.QUEUED,
      },
    });

    await this.sendQueue.add('send', {
      messageId: message.id,
      sessionId,
      phoneNumber: normalized,
      content,
    });

    return message;
  }

  async sendMedia(
    workspaceId: string,
    sessionId: string,
    phoneNumber: string,
    opts: { mediaType: string; mediaBase64: string; caption?: string; filename?: string },
  ) {
    await this.usage.assertCanSend(workspaceId);

    const session = await this.prisma.client.whatsappSession.findFirst({
      where: { id: sessionId, workspaceId },
    });
    if (!session || session.status !== SessionStatus.CONNECTED) {
      throw new ForbiddenException('Session not connected');
    }
    if (!session.scopeMedia) {
      throw new ForbiddenException('Media scope not enabled for this session');
    }
    if (!isValidPhone(phoneNumber)) {
      throw new ForbiddenException('Invalid phone number');
    }

    const normalized = normalizePhone(phoneNumber);
    const message = await this.prisma.client.message.create({
      data: {
        workspaceId,
        sessionId,
        phoneNumber: normalized,
        content: opts.caption ?? `[${opts.mediaType}]`,
        status: MessageStatus.QUEUED,
      },
    });

    await this.sendQueue.add('send', {
      messageId: message.id,
      sessionId,
      phoneNumber: normalized,
      mediaType: opts.mediaType,
      mediaBase64: opts.mediaBase64,
      caption: opts.caption,
    });

    return message;
  }
}
