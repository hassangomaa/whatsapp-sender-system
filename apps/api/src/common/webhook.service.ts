import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { createHmac } from 'crypto';
import { QUEUES } from '@whatsapp-sender/contracts';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WebhookService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUES.WEBHOOK_DELIVER) private readonly webhookQueue: Queue,
  ) {}

  async enqueueDelivery(params: {
    workspaceId: string;
    sessionId: string;
    messageId: string;
    event: string;
    url: string;
    payload: Record<string, unknown>;
  }) {
    const secret = process.env.WEBHOOK_SIGNING_SECRET ?? 'dev-webhook-secret';
    const signature = createHmac('sha256', secret)
      .update(JSON.stringify(params.payload))
      .digest('hex');

    await this.webhookQueue.add('deliver', {
      ...params,
      signature,
    });
  }
}
