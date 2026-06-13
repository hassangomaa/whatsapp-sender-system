import { Job, Worker } from 'bullmq';
import { createHmac } from 'crypto';
import {
  QUEUES,
  SendMediaJob,
  SendMessageJob,
  WebhookDeliverJob,
  ListGroupsJob,
  JoinGroupJob,
  ResolveNewsletterJob,
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
import { scheduleWebhook } from './webhook-queue';
import { enqueueAdminNotify } from './admin-notify-queue';

const connection = { url: process.env.REDIS_URL ?? 'redis://localhost:6379' };
const DEFAULT_RATE_MS = Number(process.env.SEND_RATE_LIMIT_MS ?? 3000);

async function deliverWebhook(job: WebhookDeliverJob) {
  const secret = process.env.WEBHOOK_SIGNING_SECRET ?? 'dev-webhook-secret';
  const signature = createHmac('sha256', secret).update(JSON.stringify(job.payload)).digest('hex');

  let deliveryId = job.deliveryId;

  if (!deliveryId) {
    const created = await prisma.webhookDelivery.create({
      data: {
        workspaceId: job.workspaceId,
        sessionId: job.sessionId ?? null,
        messageId: job.messageId ?? null,
        event: job.event,
        url: job.url,
        payload: job.payload as Prisma.InputJsonValue,
        success: false,
        attempts: 0,
      },
    });
    deliveryId = created.id;
  }

  await prisma.webhookDelivery.update({
    where: { id: deliveryId },
    data: { attempts: { increment: 1 } },
  });

  try {
    const res = await fetch(job.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
      },
      body: JSON.stringify(job.payload),
    });

    await prisma.webhookDelivery.update({
      where: { id: deliveryId },
      data: {
        statusCode: res.status,
        success: res.ok,
        lastError: res.ok ? null : `HTTP ${res.status}`,
      },
    });
  } catch (err) {
    await prisma.webhookDelivery.update({
      where: { id: deliveryId },
      data: {
        success: false,
        lastError: err instanceof Error ? err.message : 'unknown',
      },
    });
    throw err;
  }
}

async function markMessageSent(messageId: string, externalId?: string) {
  const message = await prisma.message.update({
    where: { id: messageId },
    data: { status: MessageStatus.SENT, externalId },
    include: { session: true },
  });

  const { isUnlimitedWorkspace } = await import('./platform-workspace');
  if (await isUnlimitedWorkspace(message.workspaceId)) {
    if (message.session.webhookUrl && message.session.scopeWebhook) {
      await scheduleWebhook(message.session.webhookUrl, message.workspaceId, message.sessionId, message.id, {
        event: 'message.sent',
        messageId: message.id,
        phoneNumber: message.phoneNumber,
        status: 'sent',
      });
    }
    return;
  }

  const usage = await prisma.usageCounter.update({
    where: { workspaceId: message.workspaceId },
    data: { messagesSent: { increment: 1 } },
  });

  const remaining = usage.messageLimit - usage.messagesSent;
  if (remaining <= 0) {
    const { loadClientAuditContext, formatWorkerQuotaExhausted } = await import('./admin-audit');
    const ctx = await loadClientAuditContext(message.workspaceId);
    ctx.messagesUsed = usage.messagesSent;
    ctx.messageLimit = usage.messageLimit;
    await enqueueAdminNotify({
      event: 'quota_exhausted',
      message: formatWorkerQuotaExhausted(ctx),
      workspaceId: message.workspaceId,
      dedupeKey: `quota:${message.workspaceId}`,
    });
  }

  if (message.session.webhookUrl && message.session.scopeWebhook) {
    await scheduleWebhook(message.session.webhookUrl, message.workspaceId, message.sessionId, message.id, {
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
    await scheduleWebhook(message.session.webhookUrl, message.workspaceId, message.sessionId, message.id, {
      event: 'message.failed',
      messageId: message.id,
      error,
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
    QUEUES.WEBHOOK_DELIVER,
    async (job: Job<WebhookDeliverJob>) => {
      await deliverWebhook(job.data);
    },
    { connection, concurrency: 3 },
  );

  new Worker(
    QUEUES.SESSION_JOIN_GROUP,
    async (job: Job<JoinGroupJob>) => {
      const jid = await sessionManager.joinGroupByInvite(job.data.sessionId, job.data.inviteCode);
      return { jid };
    },
    { connection, concurrency: 2 },
  );

  new Worker(
    QUEUES.SESSION_RESOLVE_NEWSLETTER,
    async (job: Job<ResolveNewsletterJob>) => {
      return sessionManager.resolveNewsletterInvite(job.data.sessionId, job.data.inviteCode);
    },
    { connection, concurrency: 2 },
  );

  new Worker(
    QUEUES.SESSION_LIST_GROUPS,
    async (job: Job<ListGroupsJob>) => {
      return sessionManager.listGroups(job.data.sessionId);
    },
    { connection, concurrency: 2 },
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
          await waitForSessionRateLimit(campaign.sessionId, DEFAULT_RATE_MS);
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
