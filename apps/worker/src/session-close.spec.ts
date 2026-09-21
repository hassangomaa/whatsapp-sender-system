import {
  BAILEYS_BAD_SESSION,
  BAILEYS_CONNECTION_REPLACED,
  BAILEYS_FORBIDDEN,
  BAILEYS_LOGGED_OUT,
  BAILEYS_RESTART_REQUIRED,
  extractConflictType,
  resolveCloseAction,
} from './session-close';

const ctx = (code: number | undefined, hasAuth: boolean, extra: Partial<Parameters<typeof resolveCloseAction>[0]> = {}) => ({
  code,
  hasAuth,
  ...extra,
});

describe('resolveCloseAction', () => {
  it('returns restart_pairing for Baileys 515 (restartRequired)', () => {
    expect(resolveCloseAction(ctx(BAILEYS_RESTART_REQUIRED, false))).toEqual({ type: 'restart_pairing' });
    expect(resolveCloseAction(ctx(BAILEYS_RESTART_REQUIRED, true))).toEqual({ type: 'restart_pairing' });
  });

  it('wipes only on a true device logout (401 without stream conflict)', () => {
    expect(resolveCloseAction(ctx(BAILEYS_LOGGED_OUT, true, { message: 'Connection Failure' }))).toEqual({ type: 'logout' });
    expect(resolveCloseAction(ctx(BAILEYS_LOGGED_OUT, false))).toEqual({ type: 'logout' });
  });

  it('wipes on conflict type=device_removed (phone removed the device)', () => {
    expect(
      resolveCloseAction(ctx(BAILEYS_LOGGED_OUT, true, { message: 'Stream Errored (conflict)', conflictType: 'device_removed' })),
    ).toEqual({ type: 'logout' });
  });

  it('holds (keeps auth) on conflict type=replaced', () => {
    expect(
      resolveCloseAction(ctx(BAILEYS_LOGGED_OUT, true, { message: 'Stream Errored (conflict)', conflictType: 'replaced' })),
    ).toEqual({ type: 'hold', reason: 'replaced' });
  });

  it('holds on ambiguous 401 stream conflict with unknown type', () => {
    expect(resolveCloseAction(ctx(BAILEYS_LOGGED_OUT, true, { message: 'Stream Errored (conflict)' }))).toEqual({
      type: 'hold',
      reason: 'conflict',
    });
  });

  it('holds on 440 connectionReplaced', () => {
    expect(resolveCloseAction(ctx(BAILEYS_CONNECTION_REPLACED, true))).toEqual({ type: 'hold', reason: 'replaced' });
  });

  it('restores (through the breaker) on 403 forbidden when auth exists', () => {
    expect(resolveCloseAction(ctx(BAILEYS_FORBIDDEN, true, { message: 'Connection Failure' }))).toEqual({ type: 'restore' });
    expect(resolveCloseAction(ctx(BAILEYS_FORBIDDEN, false))).toEqual({ type: 'disconnected_retry' });
  });

  it('returns restore for badSession (500) when auth exists, else disconnected_retry', () => {
    expect(resolveCloseAction(ctx(BAILEYS_BAD_SESSION, true))).toEqual({ type: 'restore' });
    expect(resolveCloseAction(ctx(BAILEYS_BAD_SESSION, false))).toEqual({ type: 'disconnected_retry' });
  });

  it('returns restore when auth files exist on transient close', () => {
    expect(resolveCloseAction(ctx(408, true))).toEqual({ type: 'restore' });
  });

  it('returns disconnected_retry when no auth and not logout', () => {
    expect(resolveCloseAction(ctx(408, false))).toEqual({ type: 'disconnected_retry' });
  });
});

describe('extractConflictType', () => {
  it('reads <conflict type> from a Baileys stream:error node', () => {
    const err = {
      data: { tag: 'stream:error', attrs: { code: '401' }, content: [{ tag: 'conflict', attrs: { type: 'replaced' } }] },
    };
    expect(extractConflictType(err)).toBe('replaced');
  });

  it('returns undefined for CB:failure errors (data is attrs only) and missing data', () => {
    expect(extractConflictType({ data: { reason: '401' } })).toBeUndefined();
    expect(extractConflictType(undefined)).toBeUndefined();
    expect(extractConflictType({})).toBeUndefined();
  });
});
