import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QUEUES } from '@whatsapp-sender/contracts';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';

@Module({
  imports: [BullModule.registerQueue({ name: QUEUES.SEND_MESSAGE })],
  controllers: [MessagesController],
  providers: [MessagesService],
})
export class MessagesModule {}
