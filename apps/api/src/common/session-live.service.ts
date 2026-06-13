import { Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_KEYS } from '@whatsapp-sender/contracts';

@Injectable()
export class SessionLiveService {
  private readonly redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379');

  async isLive(sessionId: string): Promise<boolean> {
    const value = await this.redis.get(REDIS_KEYS.sessionLive(sessionId));
    return value === '1';
  }

  async filterLive(sessionIds: string[]): Promise<Set<string>> {
    if (sessionIds.length === 0) return new Set();
    const keys = sessionIds.map((id) => REDIS_KEYS.sessionLive(id));
    const values = await this.redis.mget(...keys);
    const live = new Set<string>();
    values.forEach((value, index) => {
      if (value === '1') live.add(sessionIds[index]);
    });
    return live;
  }
}
