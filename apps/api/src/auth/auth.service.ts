import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { generateReferralCode } from '@whatsapp-sender/contracts';
import { isPlatformAdminEmail } from '../admin-platform/platform-config.service';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto, RegisterDto } from './dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    if (!dto.email) {
      throw new ConflictException('Use phone OTP signup or provide email');
    }
    const existing = await this.prisma.client.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password!, 12);
    const user = await this.prisma.client.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        name: dto.name,
        phone: dto.phone ?? null,
      },
    });

    const workspace = await this.bootstrapWorkspaceForUser(user.id, user.name ?? user.email!);

    return this.buildAuthResponse(user, workspace.id);
  }

  async login(dto: LoginDto) {
    if (!dto.email || !dto.password) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const user = await this.prisma.client.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (!user?.passwordHash || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const membership = await this.prisma.client.workspaceMember.findFirst({
      where: { userId: user.id },
      include: { workspace: true },
    });

    const workspaceId = membership?.workspaceId;
    if (!workspaceId) {
      const ws = await this.bootstrapWorkspaceForUser(user.id, user.name ?? user.email!);
      return this.buildAuthResponse(user, ws.id);
    }

    return this.buildAuthResponse(user, workspaceId);
  }

  async me(userId: string, workspaceId: string) {
    const user = await this.prisma.client.user.findUniqueOrThrow({
      where: { id: userId },
    });
    const workspace = await this.prisma.client.workspace.findFirst({
      where: { id: workspaceId, members: { some: { userId } } },
    });
    if (!workspace) {
      throw new UnauthorizedException('Workspace access denied');
    }
    return {
      user: { id: user.id, email: user.email, name: user.name, phone: user.phone },
      workspace: { id: workspace.id, name: workspace.name },
      isPlatformAdmin: isPlatformAdminEmail(user.email),
    };
  }

  async bootstrapWorkspaceForUser(userId: string, label: string) {
    const trialPlan = await this.prisma.client.plan.findUnique({
      where: { slug: 'trial' },
    });

    return this.prisma.client.workspace.create({
      data: {
        name: `${label}'s Workspace`,
        ownerId: userId,
        members: { create: { userId, role: 'owner' } },
        settings: { create: {} },
        usage: {
          create: {
            messagesSent: 0,
            messageLimit: trialPlan?.messageLimit ?? 30,
          },
        },
        referralCode: { create: { code: generateReferralCode() } },
        ...(trialPlan
          ? {
              subscription: {
                create: { planId: trialPlan.id, active: true },
              },
            }
          : {}),
      },
    });
  }

  buildAuthResponse(
    user: { id: string; email: string | null; name: string | null; phone: string | null },
    workspaceId: string,
  ) {
    const token = this.jwt.sign({ sub: user.id, workspaceId });
    return {
      token,
      user: { id: user.id, email: user.email, name: user.name, phone: user.phone },
      workspaceId,
    };
  }
}
