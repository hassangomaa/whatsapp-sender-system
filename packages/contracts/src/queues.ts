export const QUEUES = {
  SEND_MESSAGE: 'send-message',
  SESSION_INIT: 'session-init',
  SESSION_DISCONNECT: 'session-disconnect',
  SESSION_LIST_GROUPS: 'session-list-groups',
  SESSION_JOIN_GROUP: 'session-join-group',
  SESSION_RESOLVE_NEWSLETTER: 'session-resolve-newsletter',
  CAMPAIGN_RUN: 'campaign-run',
  WEBHOOK_DELIVER: 'webhook-deliver',
  ADMIN_NOTIFY: 'admin-notify',
  OTP_SEND: 'otp-send',
} as const;

export interface ListGroupsJob {
  sessionId: string;
}

export interface JoinGroupJob {
  sessionId: string;
  inviteCode: string;
}

export interface ResolveNewsletterJob {
  sessionId: string;
  inviteCode: string;
}

export interface WhatsAppGroupInfo {
  jid: string;
  subject: string;
  participants: number;
}

export interface WhatsAppNewsletterInfo {
  jid: string;
  name: string;
  subscribers?: number;
}

export interface AdminNotifyJob {
  event: 'register' | 'session_connected' | 'session_limit' | 'quota_exhausted';
  message: string;
  workspaceId?: string;
  dedupeKey?: string;
}

export interface OtpSendJob {
  phone: string;
  code: string;
}

export const REDIS_CHANNELS = {
  sessionEvent: (sessionId: string) => `session:${sessionId}:events`,
  workspaceEvent: (workspaceId: string) => `workspace:${workspaceId}:events`,
} as const;

/** Worker-written keys for live Baileys socket state (TTL refreshed while connected). */
export const REDIS_KEYS = {
  sessionLive: (sessionId: string) => `session:${sessionId}:live`,
  platformConfig: 'platform:config',
} as const;

export const SESSION_LIVE_TTL_SECONDS = 120;

/** Cached platform OTP / admin-notify config (JSON). */
export interface PlatformConfigCache {
  platformWorkspaceId: string | null;
  otpSessionId: string | null;
  adminNotifySessionId: string | null;
  adminPhone: string | null;
  adminNotifyEnabled: boolean;
}
