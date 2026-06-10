const lastSendBySession = new Map<string, number>();

export async function waitForSessionRateLimit(sessionId: string, minIntervalMs: number) {
  const last = lastSendBySession.get(sessionId) ?? 0;
  const elapsed = Date.now() - last;
  if (elapsed < minIntervalMs) {
    await new Promise((r) => setTimeout(r, minIntervalMs - elapsed));
  }
  lastSendBySession.set(sessionId, Date.now());
}
