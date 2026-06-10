import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { BullModule } from '@nestjs/bullmq';
import { QUEUES } from '@whatsapp-sender/contracts';
import { AdminNotifyModule } from '../admin-notify/admin-notify.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { OtpService } from './otp.service';
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [
    AdminNotifyModule,
    BullModule.registerQueue({ name: QUEUES.OTP_SEND }),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? 'dev-jwt-secret-min-32-characters-long',
      signOptions: { expiresIn: (process.env.JWT_EXPIRES_IN ?? '7d') as `${number}d` },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, OtpService, JwtStrategy],
  exports: [AuthService, OtpService, JwtModule],
})
export class AuthModule {}
