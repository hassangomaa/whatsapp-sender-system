import { Module } from '@nestjs/common';
import { StatusController } from './status.controller';
import { StatusService } from './status.service';
import { UsageService } from '../common/usage.service';

@Module({
  controllers: [StatusController],
  providers: [StatusService, UsageService],
})
export class StatusModule {}
