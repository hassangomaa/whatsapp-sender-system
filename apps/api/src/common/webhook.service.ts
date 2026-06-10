import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUES, WebhookDeliverJob } from '@whatsapp-sender/contracts';

@Injectable()
export class WebhookService {
  constructor(
    @InjectQueue(QUEUES.WEBHOOK_DELIVER) private readonly webhookQueue: Queue,
  ) {}

  async enqueueDelivery(params: WebhookDeliverJob) {
    await this.webhookQueue.add('deliver', params, {
      jobId: params.deliveryId ? `retry-${params.deliveryId}-${Date.now()}` : undefined,
    });
  }
}
