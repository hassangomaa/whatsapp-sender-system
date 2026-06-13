import { loadPlatformConfig } from './platform-config';
import type Redis from 'ioredis';

let cachedPlatformWorkspaceId: string | null | undefined;
let cacheLoadedAt = 0;
const CACHE_TTL_MS = 60_000;

export async function getPlatformWorkspaceId(
  client?: Pick<Redis, 'get'>,
): Promise<string | null> {
  const now = Date.now();
  if (cachedPlatformWorkspaceId !== undefined && now - cacheLoadedAt < CACHE_TTL_MS && !client) {
    return cachedPlatformWorkspaceId;
  }

  const config = await loadPlatformConfig(client);
  if (!client) {
    cachedPlatformWorkspaceId = config.platformWorkspaceId;
    cacheLoadedAt = now;
  }
  return config.platformWorkspaceId;
}

export async function isPlatformWorkspace(
  workspaceId: string,
  client?: Pick<Redis, 'get'>,
): Promise<boolean> {
  const platformId = await getPlatformWorkspaceId(client);
  return Boolean(platformId && platformId === workspaceId);
}

/** Test helper */
export function resetPlatformWorkspaceCacheForTests() {
  cachedPlatformWorkspaceId = undefined;
  cacheLoadedAt = 0;
}
