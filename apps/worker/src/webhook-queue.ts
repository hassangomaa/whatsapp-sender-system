import { Queue } from 'bullmq';
import { QUEUES, WebhookDeliverJob } from '@whatsapp-sender/contracts';
import { Prisma, prisma } from '@whatsapp-sender/database';

const connection = { url: process.env.REDIS_URL ?? 'redis://localhost:6379' };

export const webhookQueue = new Queue(QUEUES.WEBHOOK_DELIVER, { connection });

export async function scheduleWebhook(
  url: string,
  workspaceId: string,
  sessionId: string,
  messageId: string,
  payload: Record<string, unknown>,
) {
  const delivery = await prisma.webhookDelivery.create({
    data: {
      workspaceId,
      sessionId,
      messageId,
      event: String(payload.event),
      url,
      payload: payload as Prisma.InputJsonValue,
      success: false,
      attempts: 0,
    },
  });

  const job: WebhookDeliverJob = {
    deliveryId: delivery.id,
    workspaceId,
    sessionId,
    messageId,
    event: String(payload.event),
    url,
    payload,
  };

  await webhookQueue.add('deliver', job);
}
