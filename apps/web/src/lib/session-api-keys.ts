const STORAGE_KEY = 'ws_session_api_keys';

function readMap(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed as Record<string, string>;
  } catch {
    return {};
  }
}

function writeMap(map: Record<string, string>) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

export function getStoredSessionApiKey(sessionId: string): string | null {
  return readMap()[sessionId] ?? null;
}

export function setStoredSessionApiKey(sessionId: string, key: string) {
  const map = readMap();
  map[sessionId] = key;
  writeMap(map);
}

export function clearStoredSessionApiKey(sessionId: string) {
  const map = readMap();
  delete map[sessionId];
  writeMap(map);
}

export function resolveSessionApiKey(
  sessionId: string,
  apiKey?: string | null,
): string | null {
  if (apiKey) return apiKey;
  return getStoredSessionApiKey(sessionId);
}
