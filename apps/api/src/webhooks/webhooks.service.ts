import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@whatsapp-sender/database';
import { PrismaService } from '../prisma/prisma.service';
import { WebhookService } from '../common/webhook.service';
import { SettingsService } from '../settings/settings.service';
import { TestWebhookDto } from './dto';

@Injectable()
export class WebhooksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly webhook: WebhookService,
    private readonly settings: SettingsService,
  ) {}

  async listDeliveries(workspaceId: string, limit = 50, filter?: 'all' | 'success' | 'failed') {
    const where: Prisma.WebhookDeliveryWhereInput = { workspaceId };
    if (filter === 'success') where.success = true;
    if (filter === 'failed') where.success = false;

    return this.prisma.client.webhookDelivery.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async getDelivery(workspaceId: string, id: string) {
    const delivery = await this.prisma.client.webhookDelivery.findFirst({
      where: { id, workspaceId },
    });
    if (!delivery) {
      throw new NotFoundException('Webhook delivery not found');
    }
    return delivery;
  }

  async retryDelivery(workspaceId: string, id: string) {
    const delivery = await this.getDelivery(workspaceId, id);
    await this.webhook.enqueueDelivery({
      deliveryId: delivery.id,
      workspaceId: delivery.workspaceId,
      sessionId: delivery.sessionId ?? undefined,
      messageId: delivery.messageId ?? undefined,
      event: delivery.event,
      url: delivery.url,
      payload: delivery.payload as Record<string, unknown>,
    });
    return { success: true, deliveryId: delivery.id };
  }

  async testWebhook(userId: string, workspaceId: string, dto: TestWebhookDto) {
    let url = dto.url;
    let sessionId = dto.sessionId;

    if (dto.sessionId) {
      const session = await this.prisma.client.whatsappSession.findFirst({
        where: { id: dto.sessionId, workspaceId },
      });
      if (!session) {
        throw new NotFoundException('Session not found');
      }
      url = url ?? session.webhookUrl ?? undefined;
      sessionId = session.id;
    }

    if (!url) {
      const settings = await this.settings.get(userId, workspaceId);
      url = settings.workspace.defaultWebhookUrl ?? undefined;
    }

    if (!url) {
      throw new BadRequestException('No webhook URL configured for session or workspace');
    }

    const payload = {
      event: 'webhook.test',
      timestamp: new Date().toISOString(),
      workspaceId,
    };

    const delivery = await this.prisma.client.webhookDelivery.create({
      data: {
        workspaceId,
        sessionId: sessionId ?? null,
        event: 'webhook.test',
        url,
        payload,
        success: false,
        attempts: 0,
      },
    });

    await this.webhook.enqueueDelivery({
      deliveryId: delivery.id,
      workspaceId,
      sessionId,
      event: 'webhook.test',
      url,
      payload,
    });

    return { success: true, deliveryId: delivery.id, url };
  }
}
