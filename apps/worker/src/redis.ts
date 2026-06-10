import Redis from 'ioredis';
import { REDIS_CHANNELS, SessionEvent } from '@whatsapp-sender/contracts';

export const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6380');

export async function publishSessionEvent(sessionId: string, event: SessionEvent) {
  await redis.publish(REDIS_CHANNELS.sessionEvent(sessionId), JSON.stringify(event));
}
