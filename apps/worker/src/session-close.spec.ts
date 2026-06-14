import {
  BAILEYS_BAD_SESSION,
  BAILEYS_LOGGED_OUT,
  BAILEYS_RESTART_REQUIRED,
  resolveCloseAction,
} from './session-close';

describe('resolveCloseAction', () => {
  it('returns restart_pairing for Baileys 515 (restartRequired)', () => {
    expect(resolveCloseAction(BAILEYS_RESTART_REQUIRED, false)).toEqual({
      type: 'restart_pairing',
    });
    expect(resolveCloseAction(BAILEYS_RESTART_REQUIRED, true)).toEqual({
      type: 'restart_pairing',
    });
  });

  it('returns logout only for loggedOut (401)', () => {
    expect(resolveCloseAction(BAILEYS_LOGGED_OUT, true)).toEqual({ type: 'logout' });
    expect(resolveCloseAction(BAILEYS_LOGGED_OUT, false)).toEqual({ type: 'logout' });
  });

  it('returns restore for badSession (500) when auth exists, else disconnected_retry', () => {
    expect(resolveCloseAction(BAILEYS_BAD_SESSION, true)).toEqual({ type: 'restore' });
    expect(resolveCloseAction(BAILEYS_BAD_SESSION, false)).toEqual({ type: 'disconnected_retry' });
  });

  it('returns restore when auth files exist on transient close', () => {
    expect(resolveCloseAction(408, true)).toEqual({ type: 'restore' });
  });

  it('returns disconnected_retry when no auth and not logout', () => {
    expect(resolveCloseAction(408, false)).toEqual({ type: 'disconnected_retry' });
  });
});
