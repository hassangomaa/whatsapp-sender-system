export type DashboardStats = {
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
  webhookStats: { total: number; success: number; failed: number };
  recentMessages: {
    id: string;
    phoneNumber: string;
    content: string | null;
    status: string;
    createdAt: string;
    session: { name: string };
  }[];
  funnel: {
    sessionCreated: boolean;
    sessionConnected: boolean;
    firstMessageSent: boolean;
    connectedSession: { id: string; name: string; status: string } | null;
  };
  recommendedAction: string;
};

export type WebhookDelivery = {
  id: string;
  event: string;
  url: string;
  statusCode: number | null;
  success: boolean;
  attempts: number;
  lastError: string | null;
  sessionId: string | null;
  createdAt: string;
};
