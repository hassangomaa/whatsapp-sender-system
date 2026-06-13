import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { AdminNotifyJob, DEFAULT_ADMIN_PHONE, QUEUES } from '@whatsapp-sender/contracts';
import { PlatformConfigService } from '../admin-platform/platform-config.service';
import { AdminAuditService } from './admin-audit.service';

@Injectable()
export class AdminNotifyService {
  private readonly redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379');

  constructor(
    @InjectQueue(QUEUES.ADMIN_NOTIFY) private readonly queue: Queue,
    private readonly platformConfig: PlatformConfigService,
    private readonly audit: AdminAuditService,
  ) {}

  async notify(job: AdminNotifyJob) {
    const config = await this.platformConfig.getConfig();
    if (!config.adminNotifyEnabled) return;

    const adminPhone = config.adminPhone ?? process.env.ADMIN_PHONE ?? DEFAULT_ADMIN_PHONE;
    if (!adminPhone) return;

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

  /** @deprecated use AdminAuditService.formatRegister after loadContext */
  formatRegister(opts: { phone: string; name?: string | null; email?: string | null; workspaceId: string }) {
    return `New signup: +${opts.phone} (${opts.name ?? opts.email ?? opts.phone}) — workspace ${opts.workspaceId}`;
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

  get auditService() {
    return this.audit;
  }
}
