import { Global, Module } from '@nestjs/common';
import { AdminNotifyModule } from '../admin-notify/admin-notify.module';
import { PlatformConfigModule } from '../admin-platform/platform-config.module';
import { UsageService } from './usage.service';
import { QuotaGuard } from './quota.guard';
import { SessionLiveService } from './session-live.service';

@Global()
@Module({
  imports: [AdminNotifyModule, PlatformConfigModule],
  providers: [UsageService, QuotaGuard, SessionLiveService],
  exports: [UsageService, QuotaGuard, SessionLiveService],
})
export class CommonModule {}
