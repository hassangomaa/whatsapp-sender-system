import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QUEUES } from '@whatsapp-sender/contracts';
import { PublicApiController } from './public-api.controller';
import { PublicApiService } from './public-api.service';
import { SessionsModule } from '../sessions/sessions.module';

@Module({
  imports: [
    SessionsModule,
    BullModule.registerQueue(
      { name: QUEUES.SEND_MESSAGE },
      { name: QUEUES.SESSION_LIST_GROUPS },
      { name: QUEUES.SESSION_JOIN_GROUP },
      { name: QUEUES.SESSION_RESOLVE_NEWSLETTER },
    ),
  ],
  controllers: [PublicApiController],
  providers: [PublicApiService],
})
export class PublicApiModule {}
