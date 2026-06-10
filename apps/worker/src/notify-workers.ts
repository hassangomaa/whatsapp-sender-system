import { Job, Worker } from 'bullmq';
import { AdminNotifyJob, OtpSendJob, QUEUES } from '@whatsapp-sender/contracts';
import { sessionManager } from './session-manager';

const connection = { url: process.env.REDIS_URL ?? 'redis://localhost:6379' };

function notifySessionId() {
  return process.env.ADMIN_NOTIFY_SESSION_ID ?? process.env.OTP_SESSION_ID ?? '';
}

export function startNotifyWorkers() {
  new Worker(
    QUEUES.ADMIN_NOTIFY,
    async (job: Job<AdminNotifyJob>) => {
      const sessionId = notifySessionId();
      const adminPhone = process.env.ADMIN_PHONE ?? '201277785111';
      if (!sessionId) {
        console.warn('[admin-notify] ADMIN_NOTIFY_SESSION_ID not set — skip');
        return;
      }
      await sessionManager.sendText(sessionId, adminPhone, job.data.message);
      console.log(`[admin-notify] sent: ${job.data.event}`);
    },
    { connection },
  );

  new Worker(
    QUEUES.OTP_SEND,
    async (job: Job<OtpSendJob>) => {
      const sessionId = notifySessionId();
      if (!sessionId) {
        throw new Error('OTP_SESSION_ID not configured');
      }
      const text = `Your WhatsApp Sender verification code is: ${job.data.code}\n\nValid for 5 minutes. Do not share this code.`;
      await sessionManager.sendText(sessionId, job.data.phone, text);
    },
    { connection },
  );
}
