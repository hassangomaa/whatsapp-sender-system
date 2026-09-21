import Redis from 'ioredis';
import { REDIS_CHANNELS, REDIS_KEYS, SESSION_LIVE_TTL_SECONDS, SessionEvent } from '@whatsapp-sender/contracts';

export const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6380');

export async function publishSessionEvent(sessionId: string, event: SessionEvent) {
  await redis.publish(REDIS_CHANNELS.sessionEvent(sessionId), JSON.stringify(event));
}

export async function setSessionLive(sessionId: string, live: boolean) {
  const key = REDIS_KEYS.sessionLive(sessionId);
  if (live) {
    await redis.set(key, '1', 'EX', SESSION_LIVE_TTL_SECONDS);
  } else {
    await redis.del(key);
  }
}

export async function refreshSessionLive(sessionId: string) {
  await redis.set(REDIS_KEYS.sessionLive(sessionId), '1', 'EX', SESSION_LIVE_TTL_SECONDS);
}

/**
 * Session hold: auth stays on disk, auto-restore is paused until the key expires
 * (cooldown) or the user clicks Init / QR. See docs/PRP-STABLE-WA-SESSIONS.md.
 */
export interface SessionHold {
  reason: string;
  at: number;
}

const holdKey = (sessionId: string) => `session:${sessionId}:hold`;

export async function setSessionHold(sessionId: string, reason: string, ttlMs: number) {
  const hold: SessionHold = { reason, at: Date.now() };
  const ttlSeconds = Math.max(1, Math.ceil(ttlMs / 1000));
  await redis.set(holdKey(sessionId), JSON.stringify(hold), 'EX', ttlSeconds);
}

export async function getSessionHold(sessionId: string): Promise<SessionHold | null> {
  const raw = await redis.get(holdKey(sessionId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionHold;
  } catch {
    return { reason: 'unknown', at: 0 };
  }
}

export async function clearSessionHold(sessionId: string) {
  await redis.del(holdKey(sessionId));
}
