import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QUEUES } from '@whatsapp-sender/contracts';
import { PlatformConfigModule } from '../admin-platform/platform-config.module';
import { AdminNotifyService } from './admin-notify.service';
import { AdminAuditService } from './admin-audit.service';

@Module({
  imports: [
    BullModule.registerQueue({ name: QUEUES.ADMIN_NOTIFY }),
    PlatformConfigModule,
  ],
  providers: [AdminNotifyService, AdminAuditService],
  exports: [AdminNotifyService, AdminAuditService],
})
export class AdminNotifyModule {}
