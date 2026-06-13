import Redis from 'ioredis';
import { DEFAULT_ADMIN_PHONE, PlatformConfigCache, REDIS_KEYS } from '@whatsapp-sender/contracts';

export type PlatformSessionPurpose = 'otp' | 'admin_notify';

let redis: Redis | null = null;

function getRedis() {
  if (!redis) {
    redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
      maxRetriesPerRequest: null,
      lazyConnect: true,
    });
  }
  return redis;
}

export function configFromEnv(): PlatformConfigCache {
  const otpSessionId = process.env.OTP_SESSION_ID?.trim() || null;
  const adminNotifySessionId =
    process.env.ADMIN_NOTIFY_SESSION_ID?.trim() || otpSessionId;
  return {
    platformWorkspaceId: null,
    otpSessionId,
    adminNotifySessionId,
    adminPhone: process.env.ADMIN_PHONE?.trim() || DEFAULT_ADMIN_PHONE,
    adminNotifyEnabled: process.env.ADMIN_NOTIFY_ENABLED !== '0',
  };
}

export function parsePlatformConfig(raw: string | null): PlatformConfigCache | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<PlatformConfigCache>;
    return {
      platformWorkspaceId: parsed.platformWorkspaceId ?? null,
      otpSessionId: parsed.otpSessionId ?? null,
      adminNotifySessionId: parsed.adminNotifySessionId ?? null,
      adminPhone: parsed.adminPhone ?? DEFAULT_ADMIN_PHONE,
      adminNotifyEnabled: parsed.adminNotifyEnabled !== false,
    };
  } catch {
    return null;
  }
}

export async function loadPlatformConfig(
  client: Pick<Redis, 'get'> = getRedis(),
): Promise<PlatformConfigCache> {
  const cached = parsePlatformConfig(await client.get(REDIS_KEYS.platformConfig));
  if (cached) return cached;
  return configFromEnv();
}

export async function resolveSessionId(
  purpose: PlatformSessionPurpose,
  client: Pick<Redis, 'get'> = getRedis(),
): Promise<string> {
  const config = await loadPlatformConfig(client);
  if (purpose === 'otp') {
    return config.otpSessionId ?? config.adminNotifySessionId ?? '';
  }
  return (
    config.adminNotifySessionId ??
    config.otpSessionId ??
    process.env.ADMIN_NOTIFY_SESSION_ID?.trim() ??
    process.env.OTP_SESSION_ID?.trim() ??
    ''
  );
}

export async function resolveAdminPhone(
  client: Pick<Redis, 'get'> = getRedis(),
): Promise<string> {
  const config = await loadPlatformConfig(client);
  return config.adminPhone ?? process.env.ADMIN_PHONE ?? DEFAULT_ADMIN_PHONE;
}

export async function isAdminNotifyEnabled(
  client: Pick<Redis, 'get'> = getRedis(),
): Promise<boolean> {
  const config = await loadPlatformConfig(client);
  return config.adminNotifyEnabled;
}

/** Test helper — reset singleton Redis between tests. */
export function resetPlatformConfigRedisForTests() {
  redis = null;
}
