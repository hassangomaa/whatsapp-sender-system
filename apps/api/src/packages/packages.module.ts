import { Module } from '@nestjs/common';
import { PackagesController } from './packages.controller';
import { PackagesService } from './packages.service';
import { UsageService } from '../common/usage.service';

@Module({
  controllers: [PackagesController],
  providers: [PackagesService, UsageService],
})
export class PackagesModule {}
