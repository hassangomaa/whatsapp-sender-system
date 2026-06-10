import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QUEUES } from '@whatsapp-sender/contracts';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { WebhookService } from '../common/webhook.service';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [
    BullModule.registerQueue({ name: QUEUES.WEBHOOK_DELIVER }),
    SettingsModule,
  ],
  controllers: [WebhooksController],
  providers: [WebhooksService, WebhookService],
})
export class WebhooksModule {}
