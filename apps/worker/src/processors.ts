import { Job, Worker } from 'bullmq';
import { createHmac } from 'crypto';
import {
  QUEUES,
  SendMediaJob,
  SendMessageJob,
} from '@whatsapp-sender/contracts';
import {
  CampaignRecipientStatus,
  CampaignStatus,
  MessageStatus,
  Prisma,
  prisma,
} from '@whatsapp-sender/database';
import { sessionManager } from './session-manager';
import { waitForSessionRateLimit } from './rate-limiter';

const connection = { url: process.env.REDIS_URL ?? 'redis://localhost:6379' };
const DEFAULT_RATE_MS = Number(process.env.SEND_RATE_LIMIT_MS ?? 3000);

async function markMessageSent(messageId: string, externalId?: string) {
  const message = await prisma.message.update({
    where: { id: messageId },
    data: { status: MessageStatus.SENT, externalId },
    include: { session: true },
  });

  await prisma.usageCounter.update({
    where: { workspaceId: message.workspaceId },
    data: { messagesSent: { increment: 1 } },
  });

  if (message.session.webhookUrl && message.session.scopeWebhook) {
    await enqueueWebhook(message.session.webhookUrl, message.workspaceId, message.sessionId, message.id, {
      event: 'message.sent',
      messageId: message.id,
      phoneNumber: message.phoneNumber,
      status: 'sent',
    });
  }
}

async function markMessageFailed(messageId: string, error: string) {
  const message = await prisma.message.update({
    where: { id: messageId },
    data: { status: MessageStatus.FAILED, errorMessage: error },
    include: { session: true },
  });

  if (message.session.webhookUrl && message.session.scopeWebhook) {
    await enqueueWebhook(message.session.webhookUrl, message.workspaceId, message.sessionId, message.id, {
      event: 'message.failed',
      messageId: message.id,
      error,
    });
  }
}

async function enqueueWebhook(
  url: string,
  workspaceId: string,
  sessionId: string,
  messageId: string,
  payload: Record<string, unknown>,
) {
  const secret = process.env.WEBHOOK_SIGNING_SECRET ?? 'dev-webhook-secret';
  const signature = createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex');

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
      },
      body: JSON.stringify(payload),
    });
    await prisma.webhookDelivery.create({
      data: {
        workspaceId,
        sessionId,
        messageId,
        event: String(payload.event),
        url,
        payload: payload as Prisma.InputJsonValue,
        statusCode: res.status,
        success: res.ok,
        attempts: 1,
      },
    });
  } catch (err) {
    await prisma.webhookDelivery.create({
      data: {
        workspaceId,
        sessionId,
        messageId,
        event: String(payload.event),
        url,
        payload: payload as Prisma.InputJsonValue,
        success: false,
        attempts: 1,
        lastError: err instanceof Error ? err.message : 'unknown',
      },
    });
  }
}

export function startWorkers() {
  new Worker(
    QUEUES.SESSION_INIT,
    async (job: Job<{ sessionId: string }>) => {
      await sessionManager.initSession(job.data.sessionId);
    },
    { connection },
  );

  new Worker(
    QUEUES.SESSION_DISCONNECT,
    async (job: Job<{ sessionId: string }>) => {
      await sessionManager.disconnectSession(job.data.sessionId);
    },
    { connection },
  );

  new Worker(
    QUEUES.SEND_MESSAGE,
    async (job: Job<SendMessageJob | SendMediaJob>) => {
      const data = job.data;
      await waitForSessionRateLimit(data.sessionId, DEFAULT_RATE_MS);
      try {
        if ('mediaType' in data && data.mediaType) {
          const result = await sessionManager.sendMedia(
            data.sessionId,
            data.phoneNumber,
            data.mediaType,
            {
              mediaUrl: data.mediaUrl,
              mediaBase64: data.mediaBase64,
              caption: data.caption,
            },
          );
          await markMessageSent(data.messageId, result.id);
        } else if ('content' in data) {
          const result = await sessionManager.sendText(
            data.sessionId,
            data.phoneNumber,
            data.content,
          );
          await markMessageSent(data.messageId, result.id);
        }
      } catch (err) {
        await markMessageFailed(
          data.messageId,
          err instanceof Error ? err.message : 'send failed',
        );
        throw err;
      }
    },
    { connection, concurrency: Number(process.env.WORKER_CONCURRENCY ?? 5) },
  );

  new Worker(
    QUEUES.CAMPAIGN_RUN,
    async (job: Job<{ campaignId: string }>) => {
      const campaign = await prisma.campaign.findUnique({
        where: { id: job.data.campaignId },
        include: { recipients: { where: { status: CampaignRecipientStatus.PENDING } } },
      });
      if (!campaign || campaign.status !== CampaignStatus.RUNNING) {
        return;
      }

      for (const recipient of campaign.recipients) {
        const current = await prisma.campaign.findUnique({ where: { id: campaign.id } });
        if (!current || current.status !== CampaignStatus.RUNNING) {
          break;
        }

        const message = await prisma.message.create({
          data: {
            workspaceId: campaign.workspaceId,
            sessionId: campaign.sessionId,
            phoneNumber: recipient.phoneNumber,
            content: campaign.content,
            status: MessageStatus.QUEUED,
            campaignId: campaign.id,
          },
        });

        try {
          const result = await sessionManager.sendText(
            campaign.sessionId,
            recipient.phoneNumber,
            campaign.content,
          );
          await markMessageSent(message.id, result.id);
          await prisma.campaignRecipient.update({
            where: { id: recipient.id },
            data: { status: CampaignRecipientStatus.SENT },
          });
          await prisma.campaign.update({
            where: { id: campaign.id },
            data: { sentCount: { increment: 1 } },
          });
        } catch (err) {
          await markMessageFailed(message.id, err instanceof Error ? err.message : 'failed');
          await prisma.campaignRecipient.update({
            where: { id: recipient.id },
            data: {
              status: CampaignRecipientStatus.FAILED,
              errorMessage: err instanceof Error ? err.message : 'failed',
            },
          });
          await prisma.campaign.update({
            where: { id: campaign.id },
            data: { failedCount: { increment: 1 } },
          });
        }

        await new Promise((r) => setTimeout(r, 3000));
      }

      await prisma.campaign.update({
        where: { id: campaign.id },
        data: { status: CampaignStatus.COMPLETED },
      });
    },
    { connection, concurrency: 1 },
  );

  console.log('Workers started');
}
