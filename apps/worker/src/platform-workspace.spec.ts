import { isPlatformWorkspace, resetPlatformWorkspaceCacheForTests } from './platform-workspace';

describe('platform-workspace', () => {
  afterEach(() => {
    resetPlatformWorkspaceCacheForTests();
  });

  it('isPlatformWorkspace matches cached platform id', async () => {
    const configJson = JSON.stringify({
      platformWorkspaceId: 'ws-platform',
      otpSessionId: null,
      adminNotifySessionId: null,
      adminPhone: '966508334708',
      adminNotifyEnabled: true,
    });
    const redis = { get: jest.fn().mockResolvedValue(configJson) };

    await expect(isPlatformWorkspace('ws-platform', redis)).resolves.toBe(true);
    await expect(isPlatformWorkspace('ws-other', redis)).resolves.toBe(false);
  });
});
