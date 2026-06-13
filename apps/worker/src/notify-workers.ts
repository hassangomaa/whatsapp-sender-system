import { Job, Worker } from 'bullmq';
import { AdminNotifyJob, OtpSendJob, QUEUES } from '@whatsapp-sender/contracts';
import { sessionManager } from './session-manager';
import { isAdminNotifyEnabled, resolveAdminPhone, resolveSessionId } from './platform-config';

const connection = { url: process.env.REDIS_URL ?? 'redis://localhost:6379' };

export function startNotifyWorkers() {
  new Worker(
    QUEUES.ADMIN_NOTIFY,
    async (job: Job<AdminNotifyJob>) => {
      if (!(await isAdminNotifyEnabled())) {
        console.warn('[admin-notify] disabled — skip');
        return;
      }
      const sessionId = await resolveSessionId('admin_notify');
      const adminPhone = await resolveAdminPhone();
      if (!sessionId) {
        console.warn('[admin-notify] no session configured — skip');
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
      const sessionId = await resolveSessionId('otp');
      if (!sessionId) {
        throw new Error('OTP session not configured');
      }
      const text = `Your WhatsApp Sender verification code is: ${job.data.code}\n\nValid for 5 minutes. Do not share this code.`;
      await sessionManager.sendText(sessionId, job.data.phone, text);
    },
    { connection },
  );
}
