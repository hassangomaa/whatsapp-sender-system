import makeWASocket, {
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import * as fs from 'fs';
import * as path from 'path';
import QRCode from 'qrcode';
import { prisma, SessionStatus } from '@whatsapp-sender/database';
import { WHATSAPP_QR_REFRESH_SECONDS } from '@whatsapp-sender/contracts';
import { publishSessionEvent } from './redis';
import { issueApiKeyIfNeeded } from './issue-api-key';
import { BAILEYS_LOGGED_OUT, resolveCloseAction } from './session-close';

const sessionsDir = path.join(process.cwd(), 'sessions');
const MOCK_AUTO_CONNECT_MS = Number(process.env.BAILEYS_MOCK_CONNECT_MS ?? 3000);

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

export class SessionManager {
  private sockets = new Map<string, ReturnType<typeof makeWASocket>>();
  private mockTimers = new Map<string, { connect: NodeJS.Timeout; refresh: NodeJS.Timeout }>();
  private initInFlight = new Set<string>();

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

          logSession(sessionId, 'connected', { phone });

          await prisma.whatsappSession.update({
            where: { id: sessionId },
            data: {
              status: SessionStatus.CONNECTED,
              phone,
              qrCode: null,
              lastConnectedAt: new Date(),
            },
          });

          await issueApiKeyIfNeeded(sessionId);

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
            setTimeout(() => {
              this.initSession(sessionId, { restore: true }).catch((err) => {
                console.error(`Failed to restart session ${sessionId}`, err);
              });
            }, 1000);
            return;
          }

          if (action.type === 'logout') {
            const loggedOut = code === BAILEYS_LOGGED_OUT;
            await this.clearAuthState(sessionId);
            await prisma.whatsappSession.update({
              where: { id: sessionId },
              data: {
                status: SessionStatus.DISCONNECTED,
                qrCode: null,
                phone: null,
                apiKeyHash: null,
                apiKeyPrefix: null,
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
            setTimeout(() => {
              this.initSession(sessionId, { restore: true }).catch((err) => {
                console.error(`Failed to restore session ${sessionId}`, err);
              });
            }, 2000);
            return;
          }

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
            setTimeout(() => {
              this.initSession(sessionId).catch((err) => {
                console.error(`Failed to re-init session ${sessionId}`, err);
              });
            }, 2000);
          }
        }
      });
    } finally {
      this.initInFlight.delete(sessionId);
    }
  }

  async disconnectSession(sessionId: string) {
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
    await this.clearAuthState(sessionId);
    await prisma.whatsappSession.update({
      where: { id: sessionId },
      data: {
        status: SessionStatus.DISCONNECTED,
        qrCode: null,
        phone: null,
        apiKeyHash: null,
        apiKeyPrefix: null,
      },
    });
    await publishSessionEvent(sessionId, {
      type: 'disconnected',
      sessionId,
      status: 'disconnected',
      message: 'Session disconnected',
    });
  }

  async sendText(sessionId: string, phoneNumber: string, content: string) {
    if (process.env.BAILEYS_MOCK === '1') {
      return { id: `mock-${Date.now()}` };
    }

    const sock = this.sockets.get(sessionId);
    if (!sock?.user) {
      throw new Error('Session not connected');
    }
    const jid = `${phoneNumber}@s.whatsapp.net`;
    const result = await sock.sendMessage(jid, { text: content });
    return { id: result?.key?.id ?? `msg-${Date.now()}` };
  }

  async sendMedia(
    sessionId: string,
    phoneNumber: string,
    mediaType: string,
    opts: { mediaUrl?: string; mediaBase64?: string; caption?: string },
  ) {
    if (process.env.BAILEYS_MOCK === '1') {
      return { id: `mock-media-${Date.now()}` };
    }

    const sock = this.sockets.get(sessionId);
    if (!sock?.user) {
      throw new Error('Session not connected');
    }
    const jid = `${phoneNumber}@s.whatsapp.net`;
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

  async restoreConnectedSessions() {
    const sessions = await prisma.whatsappSession.findMany({
      where: { status: SessionStatus.CONNECTED },
    });
    for (const session of sessions) {
      await this.initSession(session.id, { restore: true }).catch((err) => {
        console.error(`Failed to restore session ${session.id}`, err);
      });
    }
  }

  async pingSessions() {
    for (const [sessionId, sock] of this.sockets) {
      if (sock.user) {
        await prisma.whatsappSession
          .update({
            where: { id: sessionId },
            data: { lastConnectedAt: new Date() },
          })
          .catch(() => {});
      }
    }
  }

  async shutdown() {
    for (const sessionId of this.mockTimers.keys()) {
      this.clearMockTimer(sessionId);
    }
    for (const [sessionId, sock] of this.sockets) {
      try {
        sock.end(undefined);
      } catch {}
      this.sockets.delete(sessionId);
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
