import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QUEUES } from '@whatsapp-sender/contracts';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';
import { UsageService } from '../common/usage.service';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: QUEUES.SESSION_INIT },
      { name: QUEUES.SESSION_DISCONNECT },
    ),
  ],
  controllers: [SessionsController],
  providers: [SessionsService, UsageService],
  exports: [SessionsService],
})
export class SessionsModule {}
