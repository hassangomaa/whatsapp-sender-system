export interface ClientAuditContext {
  workspaceId: string;
  workspaceName: string;
  ownerName?: string | null;
  ownerEmail?: string | null;
  ownerPhone?: string | null;
  planName?: string;
  messagesUsed?: number;
  messageLimit?: number;
  sessionsUsed?: number;
  maxSessions?: number;
}

function clientLabel(ctx: ClientAuditContext): string {
  const name = ctx.ownerName ?? ctx.ownerEmail ?? (ctx.ownerPhone ? `+${ctx.ownerPhone}` : 'Unknown');
  const contact = ctx.ownerPhone ? ` (+${ctx.ownerPhone})` : '';
  const email = ctx.ownerEmail ? ` · ${ctx.ownerEmail}` : '';
  return `${name}${contact}${email}`;
}

export function formatAuditRegister(ctx: ClientAuditContext): string {
  return `New client: ${clientLabel(ctx)} · Workspace "${ctx.workspaceName}" · ${ctx.planName ?? 'Trial'}`;
}

export function formatAuditSessionConnected(
  ctx: ClientAuditContext,
  opts: { sessionName: string; sessionPhone: string },
): string {
  return (
    `Client connected WhatsApp: ${clientLabel(ctx)} · Session "${opts.sessionName}" +${opts.sessionPhone}` +
    ` · Plan ${ctx.planName ?? 'Trial'} · ws ${ctx.workspaceId.slice(0, 8)}`
  );
}

export function formatAuditQuotaExhausted(ctx: ClientAuditContext): string {
  const used = ctx.messagesUsed ?? 0;
  const limit = ctx.messageLimit ?? 0;
  return (
    `Client blocked (quota): ${clientLabel(ctx)} · ${used}/${limit} used` +
    ` · ${ctx.planName ?? 'Trial'} · Upgrade needed`
  );
}

export function formatAuditSessionLimit(ctx: ClientAuditContext): string {
  const used = ctx.sessionsUsed ?? 0;
  const max = ctx.maxSessions ?? 0;
  return (
    `Client blocked (sessions): ${clientLabel(ctx)} · ${used}/${max} sessions` +
    ` · ${ctx.planName ?? 'Trial'} · Upgrade needed`
  );
}

export const DEFAULT_ADMIN_PHONE = '966508334708';
