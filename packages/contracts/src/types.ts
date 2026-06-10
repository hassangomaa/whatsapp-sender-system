export interface SendMessageJob {
  messageId: string;
  sessionId: string;
  phoneNumber: string;
  content: string;
}

export interface SendMediaJob {
  messageId: string;
  sessionId: string;
  phoneNumber: string;
  mediaType: string;
  mediaUrl?: string;
  mediaBase64?: string;
  caption?: string;
}

export interface SessionInitJob {
  sessionId: string;
}

export interface WebhookDeliverJob {
  deliveryId?: string;
  workspaceId: string;
  sessionId?: string;
  messageId?: string;
  event: string;
  url: string;
  payload: Record<string, unknown>;
}

export interface SessionEvent {
  type: 'qr' | 'connected' | 'disconnected' | 'error' | 'snapshot';
  sessionId: string;
  qr?: string;
  phone?: string;
  message?: string;
  status?: string;
  /** Unix ms — when the current QR expires (WhatsApp ~20s refresh). */
  qrExpiresAt?: number;
  /** True when BAILEYS_MOCK=1 simulated the connection (no real scan). */
  mock?: boolean;
}

export interface PublicSendResponse {
  id?: string;
  messageId?: string;
  status?: string;
}

export interface DashboardFunnel {
  sessionCreated: boolean;
  sessionConnected: boolean;
  firstMessageSent: boolean;
  connectedSession: { id: string; name: string; status: string } | null;
}

export interface DashboardRecentMessage {
  id: string;
  phoneNumber: string;
  content: string | null;
  status: string;
  createdAt: string;
  session: { name: string };
}

export interface DashboardWebhookStats {
  total: number;
  success: number;
  failed: number;
}

export interface DashboardStats {
  totalSessions: number;
  connectedSessions: number;
  connectionHealthPercent: number;
  activePackages: number;
  messagesSent: number;
  trialRemaining: number;
  trialUsed: number;
  trialLimit: number;
  planName: string;
  maxSessions: number;
  sessionsUsed: number;
  recentWebhookFailures: number;
  webhookStats: DashboardWebhookStats;
  recentMessages: DashboardRecentMessage[];
  funnel: DashboardFunnel;
  recommendedAction: string;
}

export interface StatusCenterSummary {
  connectedSessions: number;
  totalSessions: number;
  webhookHealthy: number;
  webhookTotal: number;
  quotaAlerts: number;
  trialRemaining: number;
  referralCode: string | null;
}
