import { prisma } from '@whatsapp-sender/database';
import {
  ClientAuditContext,
  formatAuditQuotaExhausted,
  formatAuditSessionConnected,
} from '@whatsapp-sender/contracts';

export async function loadClientAuditContext(workspaceId: string): Promise<ClientAuditContext> {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    include: {
      owner: true,
      usage: true,
      subscription: { include: { plan: true } },
      sessions: { select: { id: true } },
    },
  });

  if (!workspace) {
    return { workspaceId, workspaceName: workspaceId };
  }

  const plan = workspace.subscription?.plan;
  return {
    workspaceId: workspace.id,
    workspaceName: workspace.name,
    ownerName: workspace.owner.name,
    ownerEmail: workspace.owner.email,
    ownerPhone: workspace.owner.phone,
    planName: plan?.name ?? 'Trial',
    messagesUsed: workspace.usage?.messagesSent ?? 0,
    messageLimit: workspace.usage?.messageLimit ?? plan?.messageLimit ?? 30,
    sessionsUsed: workspace.sessions.length,
    maxSessions: plan?.maxSessions ?? 1,
  };
}

export function formatWorkerSessionConnected(
  ctx: ClientAuditContext,
  opts: { sessionName: string; sessionPhone: string },
): string {
  return formatAuditSessionConnected(ctx, opts);
}

export function formatWorkerQuotaExhausted(ctx: ClientAuditContext): string {
  return formatAuditQuotaExhausted(ctx);
}
