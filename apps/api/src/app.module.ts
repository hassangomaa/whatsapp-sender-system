import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { AuthModule } from './auth/auth.module';
import { SessionsModule } from './sessions/sessions.module';
import { PublicApiModule } from './public-api/public-api.module';
import { MessagesModule } from './messages/messages.module';
import { StatusModule } from './status/status.module';
import { PackagesModule } from './packages/packages.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { SettingsModule } from './settings/settings.module';
import { PrismaModule } from './prisma/prisma.module';
import { CommonModule } from './common/common.module';
import { AdminNotifyModule } from './admin-notify/admin-notify.module';
import { AdminPlatformModule } from './admin-platform/admin-platform.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    BullModule.forRoot({
      connection: {
        url: process.env.REDIS_URL ?? 'redis://localhost:6379',
      },
    }),
    PrismaModule,
    CommonModule,
    AdminNotifyModule,
    AuthModule,
    SessionsModule,
    PublicApiModule,
    MessagesModule,
    StatusModule,
    PackagesModule,
    CampaignsModule,
    DashboardModule,
    WebhooksModule,
    SettingsModule,
    AdminPlatformModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
