import { isPlatformAdminEmail } from '@whatsapp-sender/contracts';
import { prisma } from '@whatsapp-sender/database';
import { loadPlatformConfig } from './platform-config';
import type Redis from 'ioredis';

let cachedPlatformWorkspaceId: string | null | undefined;
let cacheLoadedAt = 0;
const CACHE_TTL_MS = 60_000;

const unlimitedCache = new Map<string, { value: boolean; expires: number }>();

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

/** Platform workspace or any workspace owned by a PLATFORM_ADMIN_EMAILS user. */
export async function isUnlimitedWorkspace(
  workspaceId: string,
  client?: Pick<Redis, 'get'>,
): Promise<boolean> {
  const cached = unlimitedCache.get(workspaceId);
  if (cached && cached.expires > Date.now()) {
    return cached.value;
  }

  if (await isPlatformWorkspace(workspaceId, client)) {
    unlimitedCache.set(workspaceId, { value: true, expires: Date.now() + CACHE_TTL_MS });
    return true;
  }

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    include: { owner: { select: { email: true } } },
  });
  const unlimited = isPlatformAdminEmail(workspace?.owner?.email);
  unlimitedCache.set(workspaceId, { value: unlimited, expires: Date.now() + CACHE_TTL_MS });
  return unlimited;
}

/** Test helper */
export function resetPlatformWorkspaceCacheForTests() {
  cachedPlatformWorkspaceId = undefined;
  cacheLoadedAt = 0;
  unlimitedCache.clear();
}
