/** Baileys DisconnectReason values (duplicated to keep unit tests ESM-free). */
export const BAILEYS_RESTART_REQUIRED = 515;
export const BAILEYS_LOGGED_OUT = 401;
export const BAILEYS_BAD_SESSION = 500;

export type CloseAction =
  | { type: 'restart_pairing' }
  | { type: 'logout' }
  | { type: 'restore' }
  | { type: 'disconnected' }
  | { type: 'disconnected_retry' };

/** Pure close-code routing used by SessionManager (515 must never clear auth). */
export function resolveCloseAction(code: number | undefined, hasAuth: boolean): CloseAction {
  if (code === BAILEYS_RESTART_REQUIRED) {
    return { type: 'restart_pairing' };
  }
  if (code === BAILEYS_LOGGED_OUT || code === BAILEYS_BAD_SESSION) {
    return { type: 'logout' };
  }
  if (hasAuth) {
    return { type: 'restore' };
  }
  return { type: 'disconnected_retry' };
}
