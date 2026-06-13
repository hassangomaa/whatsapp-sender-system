import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PlatformConfigService } from './platform-config.service';

@Module({
  imports: [PrismaModule],
  providers: [PlatformConfigService],
  exports: [PlatformConfigService],
})
export class PlatformConfigModule {}
