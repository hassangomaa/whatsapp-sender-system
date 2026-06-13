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
