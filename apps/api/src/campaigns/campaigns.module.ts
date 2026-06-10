import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QUEUES } from '@whatsapp-sender/contracts';
import { CampaignsController } from './campaigns.controller';
import { CampaignsService } from './campaigns.service';

@Module({
  imports: [BullModule.registerQueue({ name: QUEUES.CAMPAIGN_RUN })],
  controllers: [CampaignsController],
  providers: [CampaignsService],
})
export class CampaignsModule {}
