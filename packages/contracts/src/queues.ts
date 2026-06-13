export const QUEUES = {
  SEND_MESSAGE: 'send-message',
  SESSION_INIT: 'session-init',
  SESSION_DISCONNECT: 'session-disconnect',
  CAMPAIGN_RUN: 'campaign-run',
  WEBHOOK_DELIVER: 'webhook-deliver',
  ADMIN_NOTIFY: 'admin-notify',
  OTP_SEND: 'otp-send',
} as const;

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
} as const;

export const SESSION_LIVE_TTL_SECONDS = 120;
