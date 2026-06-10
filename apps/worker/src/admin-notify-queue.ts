import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { AdminNotifyJob, QUEUES } from '@whatsapp-sender/contracts';

const connection = { url: process.env.REDIS_URL ?? 'redis://localhost:6379' };
const queue = new Queue(QUEUES.ADMIN_NOTIFY, { connection });
const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379');

export async function enqueueAdminNotify(job: AdminNotifyJob) {
  if (process.env.ADMIN_NOTIFY_ENABLED === '0') return;

  if (job.dedupeKey) {
    const key = `admin-notify:dedupe:${job.dedupeKey}`;
    const set = await redis.set(key, '1', 'EX', 86400, 'NX');
    if (set !== 'OK') return;
  }

  await queue.add('notify', job);
}
