import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { AdminNotifyJob, QUEUES } from '@whatsapp-sender/contracts';

@Injectable()
export class AdminNotifyService {
  private readonly redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379');
  private readonly enabled = process.env.ADMIN_NOTIFY_ENABLED !== '0';
  private readonly adminPhone = process.env.ADMIN_PHONE ?? '201277785111';

  constructor(@InjectQueue(QUEUES.ADMIN_NOTIFY) private readonly queue: Queue) {}

  async notify(job: AdminNotifyJob) {
    if (!this.enabled || !this.adminPhone) return;

    if (job.dedupeKey) {
      const key = `admin-notify:dedupe:${job.dedupeKey}`;
      const set = await this.redis.set(key, '1', 'EX', 86400, 'NX');
      if (set !== 'OK') return;
    }

    await this.queue.add('notify', {
      ...job,
      message: job.message,
    });
  }

  formatRegister(opts: { phone: string; name?: string | null; email?: string | null; workspaceId: string }) {
    const label = opts.name ?? opts.email ?? opts.phone;
    return `New signup: +${opts.phone} (${label}) — workspace ${opts.workspaceId}`;
  }

  formatSessionConnected(opts: { sessionName: string; phone: string; workspaceId: string }) {
    return `Session linked: ${opts.sessionName} +${opts.phone} — workspace ${opts.workspaceId}`;
  }

  formatSessionLimit(opts: { workspaceId: string; used: number; max: number }) {
    return `Session limit reached: workspace ${opts.workspaceId} (${opts.used}/${opts.max})`;
  }

  formatQuotaExhausted(opts: { workspaceId: string; used: number; limit: number }) {
    return `Quota exhausted: workspace ${opts.workspaceId} (${opts.used}/${opts.limit})`;
  }
}
