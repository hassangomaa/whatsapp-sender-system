const mockFindMany = jest.fn();
const mockUpdate = jest.fn().mockResolvedValue({});
const mockIsConnected = jest.fn();
const mockHasAuthFiles = jest.fn();
const mockInitSession = jest.fn().mockResolvedValue(undefined);
const mockIsReconnectPending = jest.fn();
const mockRefreshLiveStatus = jest.fn().mockResolvedValue(undefined);
const mockClearLiveStatus = jest.fn().mockResolvedValue(undefined);

jest.mock('./session-manager', () => ({
  sessionManager: {
    isConnected: (...args: unknown[]) => mockIsConnected(...args),
    hasAuthFiles: (...args: unknown[]) => mockHasAuthFiles(...args),
    initSession: (...args: unknown[]) => mockInitSession(...args),
    isReconnectPending: (...args: unknown[]) => mockIsReconnectPending(...args),
    refreshLiveStatus: (...args: unknown[]) => mockRefreshLiveStatus(...args),
    clearLiveStatus: (...args: unknown[]) => mockClearLiveStatus(...args),
  },
}));

jest.mock('@whatsapp-sender/database', () => ({
  SessionStatus: {
    CONNECTED: 'CONNECTED',
    CONNECTING: 'CONNECTING',
    DISCONNECTED: 'DISCONNECTED',
  },
  prisma: {
    whatsappSession: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
    },
  },
}));

import { SessionStatus } from '@whatsapp-sender/database';
import { startHealthLoop } from './health-loop';

describe('startHealthLoop', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockIsReconnectPending.mockReturnValue(false);
    process.env.BAILEYS_MOCK = '0';
    delete process.env.SESSION_HEALTH_INTERVAL_MS;
    delete process.env.SESSION_STALE_THRESHOLD_MS;
    delete process.env.SESSION_HEALTH_STARTUP_GRACE_MS;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  async function runTick() {
    await jest.advanceTimersByTimeAsync(30_000);
  }

  it('updates lastConnectedAt when socket is live', async () => {
    mockFindMany.mockResolvedValue([
      {
        id: 's1',
        status: SessionStatus.CONNECTED,
        phone: '201200000000',
        lastConnectedAt: new Date(Date.now() - 60_000),
      },
    ]);

    mockIsConnected.mockReturnValue(true);

    const stop = startHealthLoop();
    await runTick();

    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 's1' },
      data: {
        lastConnectedAt: expect.any(Date),
        status: SessionStatus.CONNECTED,
      },
    });
    expect(mockInitSession).not.toHaveBeenCalled();
    stop();
  });

  it('triggers reconnect when auth files exist but socket is missing', async () => {
    mockFindMany.mockResolvedValue([
      {
        id: 's1',
        status: SessionStatus.CONNECTED,
        phone: '201200000000',
        lastConnectedAt: new Date(),
      },
    ]);
    mockIsConnected.mockReturnValue(false);
    mockHasAuthFiles.mockReturnValue(true);

    const stop = startHealthLoop();
    await runTick();

    expect(mockInitSession).toHaveBeenCalledWith('s1', { restore: true });
    stop();
  });

  it('restores falsely disconnected sessions that still have auth and phone', async () => {
    mockFindMany.mockResolvedValue([
      {
        id: 's1',
        status: SessionStatus.DISCONNECTED,
        phone: '201200000000',
        lastConnectedAt: new Date(Date.now() - 600_000),
      },
    ]);
    mockIsConnected.mockReturnValue(false);
    mockHasAuthFiles.mockReturnValue(true);

    const stop = startHealthLoop();
    await runTick();

    expect(mockInitSession).toHaveBeenCalledWith('s1', { restore: true });
    expect(mockUpdate).not.toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: SessionStatus.DISCONNECTED },
      }),
    );
    stop();
  });

  it('marks disconnected when connected in DB but no auth files and stale', async () => {
    process.env.SESSION_HEALTH_STARTUP_GRACE_MS = '0';
    process.env.SESSION_STALE_THRESHOLD_MS = '1000';

    mockFindMany.mockResolvedValue([
      {
        id: 's1',
        status: SessionStatus.CONNECTED,
        phone: '201200000000',
        lastConnectedAt: new Date(Date.now() - 10_000),
      },
    ]);
    mockIsConnected.mockReturnValue(false);
    mockHasAuthFiles.mockReturnValue(false);

    const stop = startHealthLoop();
    await runTick();

    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 's1' },
      data: { status: SessionStatus.DISCONNECTED },
    });
    stop();
  });

  it('skips reconnect when a reconnect timer is already pending', async () => {
    mockFindMany.mockResolvedValue([
      {
        id: 's1',
        status: SessionStatus.CONNECTED,
        phone: '201200000000',
        lastConnectedAt: new Date(),
      },
    ]);
    mockIsConnected.mockReturnValue(false);
    mockHasAuthFiles.mockReturnValue(true);
    mockIsReconnectPending.mockReturnValue(true);

    const stop = startHealthLoop();
    await runTick();

    expect(mockInitSession).not.toHaveBeenCalled();
    stop();
  });

  it('skips stale disconnect during startup grace period', async () => {
    process.env.SESSION_HEALTH_STARTUP_GRACE_MS = '300000';
    process.env.SESSION_STALE_THRESHOLD_MS = '1000';

    mockFindMany.mockResolvedValue([
      {
        id: 's1',
        status: SessionStatus.CONNECTED,
        phone: null,
        lastConnectedAt: new Date(Date.now() - 10_000),
      },
    ]);
    mockIsConnected.mockReturnValue(false);
    mockHasAuthFiles.mockReturnValue(false);

    const stop = startHealthLoop();
    await runTick();

    expect(mockUpdate).not.toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: SessionStatus.DISCONNECTED },
      }),
    );
    stop();
  });
});
