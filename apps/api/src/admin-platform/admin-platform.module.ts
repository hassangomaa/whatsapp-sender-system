import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SessionsModule } from '../sessions/sessions.module';
import { AdminPlatformController } from './admin-platform.controller';
import { AdminPlatformService } from './admin-platform.service';
import { PlatformConfigService } from './platform-config.service';
import { PlatformAdminGuard } from './platform-admin.guard';

@Module({
  imports: [AuthModule, SessionsModule],
  controllers: [AdminPlatformController],
  providers: [AdminPlatformService, PlatformConfigService, PlatformAdminGuard],
  exports: [PlatformConfigService, PlatformAdminGuard],
})
export class AdminPlatformModule {}
