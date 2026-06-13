import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QUEUES } from '@whatsapp-sender/contracts';
import { PublicApiController } from './public-api.controller';
import { PublicApiService } from './public-api.service';
import { SessionsModule } from '../sessions/sessions.module';
import { WebhookService } from '../common/webhook.service';

@Module({
  imports: [
    SessionsModule,
    BullModule.registerQueue(
      { name: QUEUES.SEND_MESSAGE },
      { name: QUEUES.WEBHOOK_DELIVER },
    ),
  ],
  controllers: [PublicApiController],
  providers: [PublicApiService, WebhookService],
})
export class PublicApiModule {}
