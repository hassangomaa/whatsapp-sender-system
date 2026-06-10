import { SessionStatus, prisma } from '@whatsapp-sender/database';
import { sessionManager } from './session-manager';

const HEALTH_INTERVAL_MS = Number(process.env.SESSION_HEALTH_INTERVAL_MS ?? 30_000);
const STALE_THRESHOLD_MS = Number(process.env.SESSION_STALE_THRESHOLD_MS ?? 120_000);

export function startHealthLoop() {
  const tick = async () => {
    try {
      const connected = await prisma.whatsappSession.findMany({
        where: { status: SessionStatus.CONNECTED },
      });

      for (const session of connected) {
        const lastSeen = session.lastConnectedAt?.getTime() ?? 0;
        const isStale = Date.now() - lastSeen > STALE_THRESHOLD_MS;

        if (isStale && process.env.BAILEYS_MOCK !== '1') {
          await prisma.whatsappSession.update({
            where: { id: session.id },
            data: { status: SessionStatus.DISCONNECTED },
          });
          continue;
        }

        await prisma.whatsappSession.update({
          where: { id: session.id },
          data: { lastConnectedAt: new Date() },
        });
      }

      await sessionManager.pingSessions();
    } catch (err) {
      console.error('Health loop error', err);
    }
  };

  const interval = setInterval(tick, HEALTH_INTERVAL_MS);
  tick();

  return () => clearInterval(interval);
}
