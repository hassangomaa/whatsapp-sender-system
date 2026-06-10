import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { JwtService } from '@nestjs/jwt';
import { isValidPhone, normalizePhone, OtpSendJob, QUEUES } from '@whatsapp-sender/contracts';
import { PrismaService } from '../prisma/prisma.service';
import { AdminNotifyService } from '../admin-notify/admin-notify.service';
import { AuthService } from './auth.service';
import { RequestOtpDto, VerifyOtpDto } from './dto';

const OTP_TTL_SEC = 300;
const OTP_COOLDOWN_SEC = 60;

@Injectable()
export class OtpService {
  private readonly redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379');
  private readonly devMode = process.env.OTP_DEV_MODE === '1';

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly auth: AuthService,
    private readonly adminNotify: AdminNotifyService,
    @InjectQueue(QUEUES.OTP_SEND) private readonly otpQueue: Queue,
  ) {}

  async requestOtp(dto: RequestOtpDto) {
    const phone = normalizePhone(dto.phone);
    if (!isValidPhone(phone)) {
      throw new BadRequestException('Invalid phone number');
    }

    const cooldownKey = `otp:cooldown:${phone}`;
    if (await this.redis.get(cooldownKey)) {
      throw new BadRequestException('Please wait before requesting another code');
    }

    const code = this.devMode ? '123456' : String(Math.floor(100000 + Math.random() * 900000));
    await this.redis.set(`otp:${phone}`, code, 'EX', OTP_TTL_SEC);
    await this.redis.set(cooldownKey, '1', 'EX', OTP_COOLDOWN_SEC);

    if (this.devMode) {
      console.log(`[OTP_DEV] code for +${phone}: ${code}`);
    } else {
      await this.otpQueue.add('send', { phone, code } satisfies OtpSendJob);
    }

    return { ok: true, phone, expiresIn: OTP_TTL_SEC, devMode: this.devMode };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const phone = normalizePhone(dto.phone);
    const stored = await this.redis.get(`otp:${phone}`);
    if (!stored || stored !== dto.code) {
      throw new UnauthorizedException('Invalid or expired code');
    }
    await this.redis.del(`otp:${phone}`);

    const existing = await this.prisma.client.user.findUnique({ where: { phone } });

    if (!existing) {
      const user = await this.prisma.client.user.create({
        data: {
          phone,
          phoneVerifiedAt: new Date(),
          name: dto.name,
          email: dto.email?.toLowerCase() ?? null,
        },
      });
      const workspace = await this.auth.bootstrapWorkspaceForUser(user.id, user.name ?? phone);
      await this.adminNotify.notify({
        event: 'register',
        message: this.adminNotify.formatRegister({
          phone,
          name: user.name,
          email: user.email,
          workspaceId: workspace.id,
        }),
        workspaceId: workspace.id,
        dedupeKey: `register:${user.id}`,
      });
      return this.auth.buildAuthResponse(user, workspace.id);
    }

    const user = await this.prisma.client.user.update({
      where: { id: existing.id },
      data: {
        phoneVerifiedAt: new Date(),
        ...(dto.name ? { name: dto.name } : {}),
        ...(dto.email ? { email: dto.email.toLowerCase() } : {}),
      },
    });

    const membership = await this.prisma.client.workspaceMember.findFirst({
      where: { userId: user.id },
    });
    const workspaceId = membership?.workspaceId ?? (await this.auth.bootstrapWorkspaceForUser(user.id, user.name ?? phone)).id;

    return this.auth.buildAuthResponse(user, workspaceId);
  }

  /** Dev-only: peek OTP for smoke tests */
  async peekOtp(phone: string) {
    if (process.env.OTP_DEV_MODE !== '1') {
      throw new UnauthorizedException('Not available');
    }
    const normalized = normalizePhone(phone);
    const code = await this.redis.get(`otp:${normalized}`);
    return { code };
  }
}
