import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QUEUES } from '@whatsapp-sender/contracts';
import { AdminNotifyService } from './admin-notify.service';

@Module({
  imports: [BullModule.registerQueue({ name: QUEUES.ADMIN_NOTIFY })],
  providers: [AdminNotifyService],
  exports: [AdminNotifyService],
})
export class AdminNotifyModule {}
