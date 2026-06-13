import makeWASocket, {
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import * as fs from 'fs';
import * as path from 'path';
import QRCode from 'qrcode';
import { prisma, SessionStatus } from '@whatsapp-sender/database';
import { WHATSAPP_QR_REFRESH_SECONDS, buildMessageJid } from '@whatsapp-sender/contracts';
import { publishSessionEvent, refreshSessionLive, setSessionLive } from './redis';
import { issueApiKeyIfNeeded } from './issue-api-key';
import { enqueueAdminNotify } from './admin-notify-queue';
import { BAILEYS_LOGGED_OUT, resolveCloseAction } from './session-close';

const sessionsDir = path.join(process.cwd(), 'sessions');
const MOCK_AUTO_CONNECT_MS = Number(process.env.BAILEYS_MOCK_CONNECT_MS ?? 3000);
const RECONNECT_MAX_DELAY_MS = Number(process.env.SESSION_RECONNECT_MAX_DELAY_MS ?? 60_000);

function qrExpiresAt() {
  return Date.now() + WHATSAPP_QR_REFRESH_SECONDS * 1000;
}

function hasAuthFiles(sessionId: string): boolean {
  const sessionPath = path.join(sessionsDir, sessionId);
  return fs.existsSync(sessionPath) && fs.readdirSync(sessionPath).length > 0;
}

function logSession(sessionId: string, msg: string, extra?: Record<string, unknown>) {
  const suffix = extra ? ` ${JSON.stringify(extra)}` : '';
  console.log(`[session:${sessionId}] ${msg}${suffix}`);
}

type ReconnectReason = 'restore' | 'restart_pairing';

export class SessionManager {
  private sockets = new Map<string, ReturnType<typeof makeWASocket>>();
  private mockTimers = new Map<string, { connect: NodeJS.Timeout; refresh: NodeJS.Timeout }>();
  private initInFlight = new Set<string>();
  private reconnectAttempts = new Map<string, number>();
  private reconnectTimers = new Map<string, NodeJS.Timeout>();

  isConnected(sessionId: string): boolean {
    const sock = this.sockets.get(sessionId);
    return Boolean(sock?.user);
  }

  hasAuthFiles(sessionId: string): boolean {
    return hasAuthFiles(sessionId);
  }

  isReconnectPending(sessionId: string): boolean {
    return this.reconnectTimers.has(sessionId);
  }

  async refreshLiveStatus(sessionId: string) {
    if (this.isConnected(sessionId)) {
      await refreshSessionLive(sessionId).catch(() => {});
    }
  }

  async clearLiveStatus(sessionId: string) {
    await setSessionLive(sessionId, false).catch(() => {});
  }

  private ensureReconnect(sessionId: string) {
    if (!hasAuthFiles(sessionId)) return;
    if (this.reconnectTimers.has(sessionId) || this.initInFlight.has(sessionId)) return;
    this.scheduleReconnect(sessionId, 'restore');
  }

  async initSession(sessionId: string, opts: { restore?: boolean } = {}) {
    if (this.initInFlight.has(sessionId)) {
      logSession(sessionId, 'init already in flight — skip');
      return;
    }
    this.initInFlight.add(sessionId);

    try {
      this.clearMockTimer(sessionId);
      await this.endSocket(sessionId);

      if (process.env.BAILEYS_MOCK === '1') {
        return this.initMockSession(sessionId);
      }

      const row = await prisma.whatsappSession.findUnique({ where: { id: sessionId } });
      if (row?.disconnectRequestedAt) {
        logSession(sessionId, 'init skipped — disconnect requested');
        return;
      }

      const restoring = opts.restore || hasAuthFiles(sessionId);
      if (!restoring) {
        await this.clearAuthState(sessionId);
      }

      const sessionPath = path.join(sessionsDir, sessionId);
      fs.mkdirSync(sessionPath, { recursive: true });

      const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
      const { version } = await fetchLatestBaileysVersion();

      const sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false,
        qrTimeout: WHATSAPP_QR_REFRESH_SECONDS * 1000,
        keepAliveIntervalMs: 25_000,
        connectTimeoutMs: 60_000,
        defaultQueryTimeoutMs: 60_000,
        retryRequestDelayMs: 250,
      });

      this.sockets.set(sessionId, sock);
      sock.ev.on('creds.update', saveCreds);

      sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          const dataUrl = await QRCode.toDataURL(qr);
          const expiresAt = qrExpiresAt();
          await prisma.whatsappSession.update({
            where: { id: sessionId },
            data: { qrCode: dataUrl, status: SessionStatus.QR_PENDING },
          });
          await publishSessionEvent(sessionId, {
            type: 'qr',
            sessionId,
            qr: dataUrl,
            qrExpiresAt: expiresAt,
            status: 'qr_pending',
          });
        }

        if (connection === 'open') {
          const phone = sock.user?.id?.split(':')[0] ?? null;
          if (!phone) return;

          this.resetReconnectState(sessionId);
          logSession(sessionId, 'connected', { phone });

          await setSessionLive(sessionId, true);

          await prisma.whatsappSession.update({
            where: { id: sessionId },
            data: {
              status: SessionStatus.CONNECTED,
              phone,
              qrCode: null,
              lastConnectedAt: new Date(),
              disconnectRequestedAt: null,
            },
          });

          await issueApiKeyIfNeeded(sessionId);

          const sessionRow = await prisma.whatsappSession.findUnique({
            where: { id: sessionId },
          });
          if (sessionRow) {
            const { isPlatformWorkspace } = await import('./platform-workspace');
            if (!(await isPlatformWorkspace(sessionRow.workspaceId))) {
              const { loadClientAuditContext, formatWorkerSessionConnected } = await import(
                './admin-audit'
              );
              const ctx = await loadClientAuditContext(sessionRow.workspaceId);
              await enqueueAdminNotify({
                event: 'session_connected',
                message: formatWorkerSessionConnected(ctx, {
                  sessionName: sessionRow.name,
                  sessionPhone: phone,
                }),
                workspaceId: sessionRow.workspaceId,
                dedupeKey: `connect:${sessionId}`,
              });
            }
          }

          await publishSessionEvent(sessionId, {
            type: 'connected',
            sessionId,
            phone,
            status: 'connected',
            mock: false,
          });
        }

        if (connection === 'close') {
          const code = (lastDisconnect?.error as Boom | undefined)?.output?.statusCode;
          const action = resolveCloseAction(code, hasAuthFiles(sessionId));

          logSession(sessionId, 'connection closed', { code, action: action.type });

          await this.endSocket(sessionId);

          if (action.type === 'restart_pairing') {
            await prisma.whatsappSession.update({
              where: { id: sessionId },
              data: { status: SessionStatus.CONNECTING, qrCode: null },
            });
            await publishSessionEvent(sessionId, {
              type: 'pairing_accepted',
              sessionId,
              status: 'connecting',
              message: 'Scan accepted — finishing connection…',
            });
            this.scheduleReconnect(sessionId, 'restart_pairing');
            return;
          }

          if (action.type === 'logout') {
            this.resetReconnectState(sessionId);
            const loggedOut = code === BAILEYS_LOGGED_OUT;
            await this.clearLiveStatus(sessionId);
            await this.clearAuthState(sessionId);
            await prisma.whatsappSession.update({
              where: { id: sessionId },
              data: {
                status: SessionStatus.DISCONNECTED,
                qrCode: null,
                phone: null,
                apiKeyHash: null,
                apiKeyPrefix: null,
                disconnectRequestedAt: null,
              },
            });
            await publishSessionEvent(sessionId, {
              type: 'disconnected',
              sessionId,
              status: 'disconnected',
              message: loggedOut ? 'Logged out from WhatsApp' : 'Session invalid — scan QR again',
            });
            return;
          }

          if (action.type === 'restore') {
            await this.clearLiveStatus(sessionId);
            this.scheduleReconnect(sessionId, 'restore');
            return;
          }

          await this.clearLiveStatus(sessionId);
          await prisma.whatsappSession.update({
            where: { id: sessionId },
            data: { status: SessionStatus.DISCONNECTED, qrCode: null },
          });
          await publishSessionEvent(sessionId, {
            type: 'disconnected',
            sessionId,
            status: 'disconnected',
            message: 'Connection lost — click Init / QR to reconnect',
          });

          if (action.type === 'disconnected_retry' && !opts.restore) {
            this.scheduleReconnect(sessionId, 'restore');
          }
        }
      });
    } finally {
      this.initInFlight.delete(sessionId);
    }
  }

  async disconnectSession(sessionId: string) {
    this.resetReconnectState(sessionId);
    this.clearMockTimer(sessionId);
    const sock = this.sockets.get(sessionId);
    if (sock) {
      try {
        await sock.logout();
      } catch {
        try {
          sock.end(undefined);
        } catch {}
      }
      this.sockets.delete(sessionId);
    }
    await this.clearLiveStatus(sessionId);
    await this.clearAuthState(sessionId);
    await prisma.whatsappSession.update({
      where: { id: sessionId },
      data: {
        status: SessionStatus.DISCONNECTED,
        qrCode: null,
        phone: null,
        apiKeyHash: null,
        apiKeyPrefix: null,
        disconnectRequestedAt: null,
      },
    });
    await publishSessionEvent(sessionId, {
      type: 'disconnected',
      sessionId,
      status: 'disconnected',
      message: 'Session disconnected',
    });
  }

  async sendText(sessionId: string, recipient: string, content: string) {
    if (process.env.BAILEYS_MOCK === '1') {
      return { id: `mock-${Date.now()}` };
    }

    const sock = this.sockets.get(sessionId);
    if (!sock?.user) {
      this.ensureReconnect(sessionId);
      throw new Error('Session not connected');
    }
    const jid = buildMessageJid(recipient);
    const result = await sock.sendMessage(jid, { text: content });
    return { id: result?.key?.id ?? `msg-${Date.now()}` };
  }

  async listGroups(sessionId: string) {
    if (process.env.BAILEYS_MOCK === '1') {
      return [
        {
          jid: '120363123456789012@g.us',
          subject: 'Mock Group',
          participants: 3,
        },
      ];
    }

    const sock = this.sockets.get(sessionId);
    if (!sock?.user) {
      this.ensureReconnect(sessionId);
      throw new Error('Session not connected');
    }

    const groups = await sock.groupFetchAllParticipating();
    return Object.values(groups).map((group) => ({
      jid: group.id,
      subject: group.subject ?? '',
      participants: group.participants?.length ?? 0,
    }));
  }

  async joinGroupByInvite(sessionId: string, inviteCode: string): Promise<string> {
    if (process.env.BAILEYS_MOCK === '1') {
      return '120363123456789012@g.us';
    }

    const sock = this.sockets.get(sessionId);
    if (!sock?.user) {
      this.ensureReconnect(sessionId);
      throw new Error('Session not connected');
    }

    const jid = await sock.groupAcceptInvite(inviteCode);
    if (!jid) {
      throw new Error('Failed to join group — already joined or invalid invite');
    }
    return jid;
  }

  async resolveNewsletterInvite(sessionId: string, inviteCode: string) {
    if (process.env.BAILEYS_MOCK === '1') {
      return {
        jid: '1234567890@newsletter',
        name: 'Mock Channel',
        subscribers: 1,
      };
    }

    const sock = this.sockets.get(sessionId);
    if (!sock?.user) {
      this.ensureReconnect(sessionId);
      throw new Error('Session not connected');
    }

    const meta = await sock.newsletterMetadata('invite', inviteCode);
    if (!meta?.id) {
      throw new Error('Channel not found for invite code');
    }

    return {
      jid: meta.id,
      name: meta.name ?? '',
      subscribers: meta.subscribers ?? undefined,
    };
  }

  async sendMedia(
    sessionId: string,
    recipient: string,
    mediaType: string,
    opts: { mediaUrl?: string; mediaBase64?: string; caption?: string },
  ) {
    if (process.env.BAILEYS_MOCK === '1') {
      return { id: `mock-media-${Date.now()}` };
    }

    const sock = this.sockets.get(sessionId);
    if (!sock?.user) {
      this.ensureReconnect(sessionId);
      throw new Error('Session not connected');
    }
    const jid = buildMessageJid(recipient);
    if (mediaType === 'image' && opts.mediaUrl) {
      const result = await sock.sendMessage(jid, {
        image: { url: opts.mediaUrl },
        caption: opts.caption,
      });
      return { id: result?.key?.id ?? `media-${Date.now()}` };
    }
    throw new Error(`Unsupported media type: ${mediaType}`);
  }

  private async initMockSession(sessionId: string) {
    const publishMockQr = async () => {
      const fakeQr = await QRCode.toDataURL(`mock-session:${sessionId}:${Date.now()}`);
      const expiresAt = qrExpiresAt();
      await prisma.whatsappSession.update({
        where: { id: sessionId },
        data: { qrCode: fakeQr, status: SessionStatus.QR_PENDING },
      });
      await publishSessionEvent(sessionId, {
        type: 'qr',
        sessionId,
        qr: fakeQr,
        qrExpiresAt: expiresAt,
        status: 'qr_pending',
        mock: true,
      });
    };

    await publishMockQr();

    const refreshInterval = setInterval(() => {
      publishMockQr().catch(console.error);
    }, WHATSAPP_QR_REFRESH_SECONDS * 1000);

    const connectTimer = setTimeout(async () => {
      clearInterval(refreshInterval);
      await prisma.whatsappSession.update({
        where: { id: sessionId },
        data: {
          status: SessionStatus.CONNECTED,
          phone: '201200000000',
          qrCode: null,
          lastConnectedAt: new Date(),
        },
      });
      await issueApiKeyIfNeeded(sessionId);
      await setSessionLive(sessionId, true);
      await publishSessionEvent(sessionId, {
        type: 'connected',
        sessionId,
        phone: '201200000000',
        status: 'connected',
        mock: true,
      });
      this.mockTimers.delete(sessionId);
    }, MOCK_AUTO_CONNECT_MS);

    this.mockTimers.set(sessionId, { connect: connectTimer, refresh: refreshInterval });
  }

  async restorePersistedSessions() {
    const byStatus = await prisma.whatsappSession.findMany({
      where: {
        disconnectRequestedAt: null,
        status: { in: [SessionStatus.CONNECTED, SessionStatus.CONNECTING] },
      },
    });

    const falselyDisconnected = await prisma.whatsappSession.findMany({
      where: {
        disconnectRequestedAt: null,
        status: SessionStatus.DISCONNECTED,
        phone: { not: null },
      },
    });

    const toRestore = new Map<string, (typeof byStatus)[0]>();
    for (const session of [...byStatus, ...falselyDisconnected]) {
      if (hasAuthFiles(session.id)) {
        toRestore.set(session.id, session);
      }
    }

    if (fs.existsSync(sessionsDir)) {
      for (const dirName of fs.readdirSync(sessionsDir)) {
        if (!hasAuthFiles(dirName) || toRestore.has(dirName)) continue;
        const row = await prisma.whatsappSession.findUnique({ where: { id: dirName } });
        if (row?.phone && !row.disconnectRequestedAt) {
          toRestore.set(dirName, row);
        }
      }
    }

    for (const session of toRestore.values()) {
      logSession(session.id, 'restoring persisted session');
      await this.initSession(session.id, { restore: true }).catch((err) => {
        console.error(`Failed to restore session ${session.id}`, err);
      });
    }
  }

  /** @deprecated Use restorePersistedSessions */
  async restoreConnectedSessions() {
    return this.restorePersistedSessions();
  }

  async shutdown() {
    for (const sessionId of this.reconnectTimers.keys()) {
      this.clearReconnectTimer(sessionId);
    }
    for (const sessionId of this.mockTimers.keys()) {
      this.clearMockTimer(sessionId);
    }
    for (const [, sock] of this.sockets) {
      try {
        sock.end(undefined);
      } catch {}
    }
    this.sockets.clear();
  }

  private scheduleReconnect(sessionId: string, reason: ReconnectReason) {
    if (this.reconnectTimers.has(sessionId) || this.initInFlight.has(sessionId)) {
      return;
    }

    const attempts = this.reconnectAttempts.get(sessionId) ?? 0;
    const baseDelay = reason === 'restart_pairing' ? 1000 : 2000;
    const delay = Math.min(baseDelay * 2 ** attempts, RECONNECT_MAX_DELAY_MS);
    this.reconnectAttempts.set(sessionId, attempts + 1);

    logSession(sessionId, 'scheduling reconnect', { reason, delayMs: delay, attempt: attempts + 1 });

    publishSessionEvent(sessionId, {
      type: 'reconnecting',
      sessionId,
      status: 'connecting',
      message: 'Reconnecting to WhatsApp…',
    }).catch(console.error);

    const timer = setTimeout(() => {
      this.reconnectTimers.delete(sessionId);
      this.initSession(sessionId, { restore: true }).catch((err) => {
        console.error(`Failed to reconnect session ${sessionId}`, err);
        if (hasAuthFiles(sessionId)) {
          this.scheduleReconnect(sessionId, reason);
        }
      });
    }, delay);

    this.reconnectTimers.set(sessionId, timer);
  }

  private resetReconnectState(sessionId: string) {
    this.reconnectAttempts.delete(sessionId);
    this.clearReconnectTimer(sessionId);
  }

  private clearReconnectTimer(sessionId: string) {
    const timer = this.reconnectTimers.get(sessionId);
    if (timer) {
      clearTimeout(timer);
      this.reconnectTimers.delete(sessionId);
    }
  }

  private clearMockTimer(sessionId: string) {
    const timers = this.mockTimers.get(sessionId);
    if (timers) {
      clearTimeout(timers.connect);
      clearInterval(timers.refresh);
      this.mockTimers.delete(sessionId);
    }
  }

  private async endSocket(sessionId: string) {
    const sock = this.sockets.get(sessionId);
    if (!sock) return;
    try {
      sock.end(undefined);
    } catch {}
    this.sockets.delete(sessionId);
  }

  private async clearAuthState(sessionId: string) {
    const sessionPath = path.join(sessionsDir, sessionId);
    if (fs.existsSync(sessionPath)) {
      fs.rmSync(sessionPath, { recursive: true, force: true });
    }
  }
}

export const sessionManager = new SessionManager();
