import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateSettingsDto } from './dto';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async get(userId: string, workspaceId: string) {
    const user = await this.prisma.client.user.findUniqueOrThrow({
      where: { id: userId },
    });
    const workspace = await this.prisma.client.workspace.findFirst({
      where: { id: workspaceId, members: { some: { userId } } },
      include: { settings: true },
    });
    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    return {
      user: { id: user.id, email: user.email, name: user.name, phone: user.phone },
      workspace: {
        id: workspace.id,
        name: workspace.name,
        defaultWebhookUrl: workspace.settings?.defaultWebhookUrl ?? null,
      },
    };
  }

  async update(userId: string, workspaceId: string, dto: UpdateSettingsDto) {
    const workspace = await this.prisma.client.workspace.findFirst({
      where: { id: workspaceId, members: { some: { userId } } },
    });
    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    if (dto.name !== undefined) {
      await this.prisma.client.user.update({
        where: { id: userId },
        data: { name: dto.name },
      });
    }

    if (dto.workspaceName !== undefined) {
      await this.prisma.client.workspace.update({
        where: { id: workspaceId },
        data: { name: dto.workspaceName },
      });
    }

    if (dto.defaultWebhookUrl !== undefined) {
      await this.prisma.client.workspaceSettings.upsert({
        where: { workspaceId },
        create: { workspaceId, defaultWebhookUrl: dto.defaultWebhookUrl },
        update: { defaultWebhookUrl: dto.defaultWebhookUrl },
      });
    }

    return this.get(userId, workspaceId);
  }
}
