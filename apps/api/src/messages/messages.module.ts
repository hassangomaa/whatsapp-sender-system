import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QUEUES } from '@whatsapp-sender/contracts';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';
import { UsageService } from '../common/usage.service';

@Module({
  imports: [BullModule.registerQueue({ name: QUEUES.SEND_MESSAGE })],
  controllers: [MessagesController],
  providers: [MessagesService, UsageService],
})
export class MessagesModule {}
