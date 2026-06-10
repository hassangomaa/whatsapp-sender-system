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

export interface SessionEvent {
  type: 'qr' | 'connected' | 'disconnected' | 'error';
  sessionId: string;
  qr?: string;
  phone?: string;
  message?: string;
}

export interface PublicSendResponse {
  id?: string;
  messageId?: string;
  status?: string;
}

export interface DashboardStats {
  totalSessions: number;
  connectedSessions: number;
  activePackages: number;
  messagesSent: number;
  trialRemaining: number;
  trialUsed: number;
  trialLimit: number;
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
