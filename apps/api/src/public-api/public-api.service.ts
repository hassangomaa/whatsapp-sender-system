import {
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { isValidPhone, normalizePhone, QUEUES } from '@whatsapp-sender/contracts';
import { MessageStatus, SessionStatus } from '@whatsapp-sender/database';
import { PrismaService } from '../prisma/prisma.service';
import { SessionsService } from '../sessions/sessions.service';
import { UsageService } from '../common/usage.service';
import { WebhookService } from '../common/webhook.service';

@Injectable()
export class PublicApiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessions: SessionsService,
    private readonly usage: UsageService,
    private readonly webhooks: WebhookService,
    @InjectQueue(QUEUES.SEND_MESSAGE) private readonly sendQueue: Queue,
  ) {}

  async sendMessage(
    apiKey: string,
    idempotencyKey: string | undefined,
    phoneNumber: string,
    content: string,
  ) {
    const session = await this.resolveSession(apiKey, 'send');
    await this.usage.assertCanSend(session.workspaceId);

    if (idempotencyKey) {
      const existing = await this.prisma.client.idempotencyRecord.findUnique({
        where: { key: idempotencyKey },
      });
      if (existing) {
        return existing.response as { id: string; messageId?: string };
      }
    }

    if (!isValidPhone(phoneNumber)) {
      throw new ForbiddenException('Invalid phone number');
    }

    const normalized = normalizePhone(phoneNumber);
    const message = await this.prisma.client.message.create({
      data: {
        workspaceId: session.workspaceId,
        sessionId: session.id,
        phoneNumber: normalized,
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
        phoneNumber: normalized,
        content,
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

    const normalized = normalizePhone(payload.phoneNumber);
    const message = await this.prisma.client.message.create({
      data: {
        workspaceId: session.workspaceId,
        sessionId: session.id,
        phoneNumber: normalized,
        content: payload.caption,
        mediaType: payload.mediaType,
        mediaUrl: payload.mediaUrl,
        status: MessageStatus.QUEUED,
        idempotencyKey: idempotencyKey ?? undefined,
      },
    });

    await this.sendQueue.add('send-media', {
      messageId: message.id,
      sessionId: session.id,
      phoneNumber: normalized,
      mediaType: payload.mediaType,
      mediaUrl: payload.mediaUrl,
      mediaBase64: payload.file ? payload.file.buffer.toString('base64') : undefined,
      caption: payload.caption,
    });

    return { id: message.id, messageId: message.id };
  }

  private async resolveSession(apiKey: string | undefined, scope: 'send' | 'media') {
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
      throw new ForbiddenException('Send scope disabled for this session');
    }
    if (scope === 'media' && !session.scopeMedia) {
      throw new ForbiddenException('Media scope disabled for this session');
    }

    return session;
  }
}
