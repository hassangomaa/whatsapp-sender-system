import { SessionStatus, prisma } from '@whatsapp-sender/database';
import { sessionManager } from './session-manager';

export function startHealthLoop() {
  const healthIntervalMs = Number(process.env.SESSION_HEALTH_INTERVAL_MS ?? 30_000);
  const staleThresholdMs = Number(process.env.SESSION_STALE_THRESHOLD_MS ?? 600_000);
  const startupGraceMs = Number(process.env.SESSION_HEALTH_STARTUP_GRACE_MS ?? 300_000);
  const startedAt = Date.now();

  const tick = async () => {
    try {
      const inGrace = Date.now() - startedAt < startupGraceMs;

      const sessions = await prisma.whatsappSession.findMany({
        where: {
          disconnectRequestedAt: null,
          OR: [
            { status: SessionStatus.CONNECTED },
            { status: SessionStatus.CONNECTING },
            { status: SessionStatus.DISCONNECTED, phone: { not: null } },
          ],
        },
      });

      for (const session of sessions) {
        if (sessionManager.isConnected(session.id)) {
          await sessionManager.refreshLiveStatus(session.id);
          await prisma.whatsappSession.update({
            where: { id: session.id },
            data: {
              lastConnectedAt: new Date(),
              status: SessionStatus.CONNECTED,
            },
          });
          continue;
        }

        if (sessionManager.hasAuthFiles(session.id)) {
          if (sessionManager.isReconnectPending(session.id)) {
            continue;
          }
          if (
            session.status === SessionStatus.CONNECTED ||
            session.status === SessionStatus.CONNECTING ||
            (session.status === SessionStatus.DISCONNECTED && session.phone)
          ) {
            await sessionManager.initSession(session.id, { restore: true }).catch((err) => {
              console.error(`Health loop reconnect failed for ${session.id}`, err);
            });
          }
          continue;
        }

        if (
          session.status === SessionStatus.CONNECTED &&
          !inGrace &&
          process.env.BAILEYS_MOCK !== '1'
        ) {
          const lastSeen = session.lastConnectedAt?.getTime() ?? 0;
          const isStale = Date.now() - lastSeen > staleThresholdMs;
          if (isStale) {
            await sessionManager.clearLiveStatus(session.id);
            await prisma.whatsappSession.update({
              where: { id: session.id },
              data: { status: SessionStatus.DISCONNECTED },
            });
          }
        }
      }
    } catch (err) {
      console.error('Health loop error', err);
    }
  };

  tick();
  const interval = setInterval(tick, healthIntervalMs);

  return () => clearInterval(interval);
}
