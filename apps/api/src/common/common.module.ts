import { Global, Module } from '@nestjs/common';
import { AdminNotifyModule } from '../admin-notify/admin-notify.module';
import { UsageService } from './usage.service';
import { QuotaGuard } from './quota.guard';

@Global()
@Module({
  imports: [AdminNotifyModule],
  providers: [UsageService, QuotaGuard],
  exports: [UsageService, QuotaGuard],
})
export class CommonModule {}
