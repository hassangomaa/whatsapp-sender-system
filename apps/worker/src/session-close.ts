/** Baileys DisconnectReason values (duplicated to keep unit tests ESM-free). */
export const BAILEYS_RESTART_REQUIRED = 515;
export const BAILEYS_LOGGED_OUT = 401;
export const BAILEYS_FORBIDDEN = 403;
export const BAILEYS_CONNECTION_REPLACED = 440;
export const BAILEYS_BAD_SESSION = 500;

/** Why a session was put on hold (auth kept on disk, auto-restore paused). */
export type HoldReason = 'replaced' | 'conflict' | 'max_attempts';

export type CloseAction =
  | { type: 'restart_pairing' }
  | { type: 'logout' }
  | { type: 'restore' }
  | { type: 'hold'; reason: HoldReason }
  | { type: 'disconnected' }
  | { type: 'disconnected_retry' };

export interface CloseContext {
  code: number | undefined;
  /** Boom message, e.g. "Stream Errored (conflict)" or "Connection Failure". */
  message?: string;
  /** `<conflict type="…">` from the stream error node: "replaced" | "device_removed" | undefined. */
  conflictType?: string;
  hasAuth: boolean;
}

/**
 * Pull `<conflict type="…">` out of the Baileys Boom error. Baileys attaches the raw
 * stream node as `error.data` (see socket.ts `CB:stream:error`). For `CB:failure`
 * `data` is only the attrs object, so this returns undefined there.
 */
export function extractConflictType(err: unknown): string | undefined {
  const data = (err as { data?: unknown } | undefined)?.data as
    | { content?: unknown }
    | undefined;
  const content = data?.content;
  if (!Array.isArray(content)) return undefined;
  const conflict = content.find(
    (n) => n && typeof n === 'object' && (n as { tag?: string }).tag === 'conflict',
  ) as { attrs?: { type?: string } } | undefined;
  return conflict?.attrs?.type;
}

/**
 * Pure close-code routing used by SessionManager.
 *
 * Invariants (see docs/PRP-STABLE-WA-SESSIONS.md):
 * - 515 never clears auth.
 * - Auth is wiped only for a *true* logout: `conflict type="device_removed"`, or a
 *   401 that is not a stream conflict (i.e. `<failure reason="401">` / loggedOut).
 * - `conflict type="replaced"` / 440 mean the same creds are open elsewhere → hold.
 * - A 401 stream conflict with an unknown type is ambiguous → hold, never wipe.
 */
export function resolveCloseAction(ctx: CloseContext): CloseAction {
  const { code, message, conflictType, hasAuth } = ctx;

  if (code === BAILEYS_RESTART_REQUIRED) {
    return { type: 'restart_pairing' };
  }
  if (code === BAILEYS_CONNECTION_REPLACED) {
    return { type: 'hold', reason: 'replaced' };
  }
  if (code === BAILEYS_LOGGED_OUT) {
    if (conflictType === 'device_removed') {
      return { type: 'logout' };
    }
    if (conflictType === 'replaced') {
      return { type: 'hold', reason: 'replaced' };
    }
    if (message?.includes('Stream Errored')) {
      return { type: 'hold', reason: 'conflict' };
    }
    return { type: 'logout' };
  }
  if (code === BAILEYS_BAD_SESSION || code === BAILEYS_FORBIDDEN) {
    return hasAuth ? { type: 'restore' } : { type: 'disconnected_retry' };
  }
  if (hasAuth) {
    return { type: 'restore' };
  }
  return { type: 'disconnected_retry' };
}
