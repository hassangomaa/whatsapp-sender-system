import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { UsageService } from '../common/usage.service';

@Module({
  controllers: [DashboardController],
  providers: [DashboardService, UsageService],
})
export class DashboardModule {}
