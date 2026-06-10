export const QUEUES = {
  SEND_MESSAGE: 'send-message',
  SESSION_INIT: 'session-init',
  SESSION_DISCONNECT: 'session-disconnect',
  CAMPAIGN_RUN: 'campaign-run',
  WEBHOOK_DELIVER: 'webhook-deliver',
} as const;

export const REDIS_CHANNELS = {
  sessionEvent: (sessionId: string) => `session:${sessionId}:events`,
  workspaceEvent: (workspaceId: string) => `workspace:${workspaceId}:events`,
} as const;
