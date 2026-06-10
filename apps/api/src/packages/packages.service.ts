import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UsageService } from '../common/usage.service';

@Injectable()
export class PackagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usage: UsageService,
  ) {}

  async listPlans() {
    return this.prisma.client.plan.findMany({
      where: { active: true },
      orderBy: { messageLimit: 'asc' },
    });
  }

  async getWorkspacePackage(workspaceId: string) {
    const subscription = await this.prisma.client.subscription.findUnique({
      where: { workspaceId },
      include: { plan: true },
    });
    const usage = await this.usage.getUsage(workspaceId);
    const referral = await this.prisma.client.referralCode.findUnique({
      where: { workspaceId },
    });

    return {
      subscription,
      usage,
      referralCode: referral?.code ?? null,
    };
  }

  async activatePlan(workspaceId: string, planSlug: string) {
    const plan = await this.prisma.client.plan.findUnique({ where: { slug: planSlug } });
    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    await this.prisma.client.subscription.upsert({
      where: { workspaceId },
      create: { workspaceId, planId: plan.id, active: true },
      update: { planId: plan.id, active: true },
    });

    await this.prisma.client.usageCounter.upsert({
      where: { workspaceId },
      create: { workspaceId, messagesSent: 0, messageLimit: plan.messageLimit },
      update: { messageLimit: plan.messageLimit },
    });

    return { success: true, plan };
  }

  async redeemCode(workspaceId: string, code: string) {
    const redemption = await this.prisma.client.redemptionCode.findUnique({
      where: { code: code.toUpperCase() },
    });
    if (!redemption) {
      throw new NotFoundException('Invalid redemption code');
    }
    if (redemption.usedCount >= redemption.maxUses) {
      throw new BadRequestException('Redemption code exhausted');
    }
    if (redemption.expiresAt && redemption.expiresAt < new Date()) {
      throw new BadRequestException('Redemption code expired');
    }

    await this.prisma.client.redemptionCode.update({
      where: { id: redemption.id },
      data: { usedCount: { increment: 1 } },
    });

    await this.usage.addBonus(workspaceId, redemption.messageBonus);

    return {
      success: true,
      messageBonus: redemption.messageBonus,
      usage: await this.usage.getUsage(workspaceId),
    };
  }
}
