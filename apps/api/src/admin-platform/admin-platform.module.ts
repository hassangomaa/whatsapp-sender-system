import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SessionsModule } from '../sessions/sessions.module';
import { AdminPlatformController } from './admin-platform.controller';
import { AdminPlatformService } from './admin-platform.service';
import { PlatformConfigModule } from './platform-config.module';
import { PlatformAdminGuard } from './platform-admin.guard';

@Module({
  imports: [PlatformConfigModule, forwardRef(() => AuthModule), SessionsModule],
  controllers: [AdminPlatformController],
  providers: [AdminPlatformService, PlatformAdminGuard],
  exports: [PlatformConfigModule, PlatformAdminGuard],
})
export class AdminPlatformModule {}
