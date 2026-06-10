import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { isValidPhone, normalizePhone, QUEUES } from '@whatsapp-sender/contracts';
import { CampaignRecipientStatus, CampaignStatus } from '@whatsapp-sender/database';
import { PrismaService } from '../prisma/prisma.service';
import { UsageService } from '../common/usage.service';

@Injectable()
export class CampaignsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usage: UsageService,
    @InjectQueue(QUEUES.CAMPAIGN_RUN) private readonly campaignQueue: Queue,
  ) {}

  async list(workspaceId: string) {
    return this.prisma.client.campaign.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
      include: { session: { select: { id: true, name: true } } },
    });
  }

  async get(workspaceId: string, id: string) {
    const campaign = await this.prisma.client.campaign.findFirst({
      where: { id, workspaceId },
      include: { recipients: { take: 100, orderBy: { createdAt: 'asc' } } },
    });
    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }
    return campaign;
  }

  async create(
    workspaceId: string,
    data: { name: string; sessionId: string; content: string; recipients: { phoneNumber: string; name?: string }[] },
  ) {
    const validRecipients = data.recipients
      .map((r) => ({
        phoneNumber: normalizePhone(r.phoneNumber),
        name: r.name,
      }))
      .filter((r) => isValidPhone(r.phoneNumber));

    if (validRecipients.length === 0) {
      throw new BadRequestException('No valid recipients');
    }

    return this.prisma.client.campaign.create({
      data: {
        workspaceId,
        sessionId: data.sessionId,
        name: data.name,
        content: data.content,
        status: CampaignStatus.DRAFT,
        totalCount: validRecipients.length,
        recipients: {
          create: validRecipients,
        },
      },
      include: { recipients: true },
    });
  }

  async start(workspaceId: string, id: string) {
    const campaign = await this.prisma.client.campaign.findFirst({
      where: { id, workspaceId },
    });
    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    const pending = await this.prisma.client.campaignRecipient.count({
      where: { campaignId: id, status: CampaignRecipientStatus.PENDING },
    });
    const usage = await this.usage.getUsage(workspaceId);
    if (usage.remaining < pending) {
      throw new BadRequestException(
        `Insufficient quota: need ${pending} messages, ${usage.remaining} remaining`,
      );
    }

    await this.prisma.client.campaign.update({
      where: { id },
      data: { status: CampaignStatus.RUNNING },
    });

    await this.campaignQueue.add('run', { campaignId: id });

    return { status: 'running', campaignId: id };
  }

  async pause(workspaceId: string, id: string) {
    await this.ensureCampaign(workspaceId, id);
    return this.prisma.client.campaign.update({
      where: { id },
      data: { status: CampaignStatus.PAUSED },
    });
  }

  async cancel(workspaceId: string, id: string) {
    await this.ensureCampaign(workspaceId, id);
    return this.prisma.client.campaign.update({
      where: { id },
      data: { status: CampaignStatus.CANCELLED },
    });
  }

  private async ensureCampaign(workspaceId: string, id: string) {
    const campaign = await this.prisma.client.campaign.findFirst({
      where: { id, workspaceId },
    });
    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }
    return campaign;
  }
}
