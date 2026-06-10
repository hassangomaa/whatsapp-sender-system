import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import * as fs from 'fs';
import * as path from 'path';
import QRCode from 'qrcode';
import { prisma, SessionStatus } from '@whatsapp-sender/database';
import { publishSessionEvent } from './redis';

const sessionsDir = path.join(process.cwd(), 'sessions');

export class SessionManager {
  private sockets = new Map<string, ReturnType<typeof makeWASocket>>();

  async initSession(sessionId: string) {
    if (process.env.BAILEYS_MOCK === '1') {
      return this.initMockSession(sessionId);
    }

    const sessionPath = path.join(sessionsDir, sessionId);
    fs.mkdirSync(sessionPath, { recursive: true });

    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: false,
    });

    this.sockets.set(sessionId, sock);

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        const dataUrl = await QRCode.toDataURL(qr);
        await prisma.whatsappSession.update({
          where: { id: sessionId },
          data: { qrCode: dataUrl, status: SessionStatus.QR_PENDING },
        });
        await publishSessionEvent(sessionId, { type: 'qr', sessionId, qr: dataUrl });
      }

      if (connection === 'open') {
        const phone = sock.user?.id?.split(':')[0] ?? null;
        await prisma.whatsappSession.update({
          where: { id: sessionId },
          data: {
            status: SessionStatus.CONNECTED,
            phone,
            qrCode: null,
            lastConnectedAt: new Date(),
          },
        });
        await publishSessionEvent(sessionId, {
          type: 'connected',
          sessionId,
          phone: phone ?? undefined,
        });
      }

      if (connection === 'close') {
        const code = (lastDisconnect?.error as Boom | undefined)?.output?.statusCode;
        const shouldReconnect = code !== DisconnectReason.loggedOut;
        await prisma.whatsappSession.update({
          where: { id: sessionId },
          data: { status: SessionStatus.DISCONNECTED, qrCode: null },
        });
        await publishSessionEvent(sessionId, {
          type: 'disconnected',
          sessionId,
          message: shouldReconnect ? 'Reconnecting...' : 'Logged out',
        });
        this.sockets.delete(sessionId);
        if (shouldReconnect) {
          setTimeout(() => this.initSession(sessionId), 5000);
        }
      }
    });
  }

  async disconnectSession(sessionId: string) {
    const sock = this.sockets.get(sessionId);
    if (sock) {
      await sock.logout();
      this.sockets.delete(sessionId);
    }
    await prisma.whatsappSession.update({
      where: { id: sessionId },
      data: { status: SessionStatus.DISCONNECTED, qrCode: null, phone: null },
    });
  }

  async sendText(sessionId: string, phoneNumber: string, content: string) {
    if (process.env.BAILEYS_MOCK === '1') {
      return { id: `mock-${Date.now()}` };
    }

    const sock = this.sockets.get(sessionId);
    if (!sock) {
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
    if (!sock) {
      throw new Error('Session not connected');
    }
    const jid = `${phoneNumber}@s.whatsapp.net`;
    // Simplified media — image URL or base64 buffer
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
    const fakeQr = await QRCode.toDataURL(`mock-session:${sessionId}`);
    await prisma.whatsappSession.update({
      where: { id: sessionId },
      data: { qrCode: fakeQr, status: SessionStatus.QR_PENDING },
    });
    await publishSessionEvent(sessionId, { type: 'qr', sessionId, qr: fakeQr });

    setTimeout(async () => {
      await prisma.whatsappSession.update({
        where: { id: sessionId },
        data: {
          status: SessionStatus.CONNECTED,
          phone: '201200000000',
          qrCode: null,
          lastConnectedAt: new Date(),
        },
      });
      await publishSessionEvent(sessionId, {
        type: 'connected',
        sessionId,
        phone: '201200000000',
      });
    }, 3000);
  }

  async restoreConnectedSessions() {
    const sessions = await prisma.whatsappSession.findMany({
      where: { status: SessionStatus.CONNECTED },
    });
    for (const session of sessions) {
      await this.initSession(session.id).catch((err) => {
        console.error(`Failed to restore session ${session.id}`, err);
      });
    }
  }

  async pingSessions() {
    for (const [sessionId, sock] of this.sockets) {
      if (sock.user) {
        await prisma.whatsappSession.update({
          where: { id: sessionId },
          data: { lastConnectedAt: new Date() },
        }).catch(() => {});
      }
    }
  }

  async shutdown() {
    for (const [sessionId, sock] of this.sockets) {
      try {
        sock.end(undefined);
      } catch {}
      this.sockets.delete(sessionId);
    }
  }
}

export const sessionManager = new SessionManager();
