import { Global, Module } from '@nestjs/common';
import { UsageService } from './usage.service';
import { QuotaGuard } from './quota.guard';

@Global()
@Module({
  providers: [UsageService, QuotaGuard],
  exports: [UsageService, QuotaGuard],
})
export class CommonModule {}
