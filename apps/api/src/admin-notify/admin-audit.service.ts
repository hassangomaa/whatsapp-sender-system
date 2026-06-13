import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  ClientAuditContext,
  formatAuditQuotaExhausted,
  formatAuditRegister,
  formatAuditSessionConnected,
  formatAuditSessionLimit,
} from '@whatsapp-sender/contracts';

@Injectable()
export class AdminAuditService {
  constructor(private readonly prisma: PrismaService) {}

  async loadContext(workspaceId: string): Promise<ClientAuditContext> {
    const workspace = await this.prisma.client.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        owner: true,
        usage: true,
        subscription: { include: { plan: true } },
        sessions: { select: { id: true } },
      },
    });

    if (!workspace) {
      return {
        workspaceId,
        workspaceName: workspaceId,
      };
    }

    const limits = workspace.subscription?.plan;
    return {
      workspaceId: workspace.id,
      workspaceName: workspace.name,
      ownerName: workspace.owner.name,
      ownerEmail: workspace.owner.email,
      ownerPhone: workspace.owner.phone,
      planName: limits?.name ?? 'Trial',
      messagesUsed: workspace.usage?.messagesSent ?? 0,
      messageLimit: workspace.usage?.messageLimit ?? limits?.messageLimit ?? 30,
      sessionsUsed: workspace.sessions.length,
      maxSessions: limits?.maxSessions ?? 1,
    };
  }

  formatRegister(ctx: ClientAuditContext): string {
    return formatAuditRegister(ctx);
  }

  formatSessionConnected(
    ctx: ClientAuditContext,
    opts: { sessionName: string; sessionPhone: string },
  ): string {
    return formatAuditSessionConnected(ctx, opts);
  }

  formatQuotaExhausted(ctx: ClientAuditContext): string {
    return formatAuditQuotaExhausted(ctx);
  }

  formatSessionLimit(ctx: ClientAuditContext): string {
    return formatAuditSessionLimit(ctx);
  }
}
