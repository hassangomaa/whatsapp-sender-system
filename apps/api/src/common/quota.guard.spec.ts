import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { QuotaGuard } from './quota.guard';
import { UsageService } from './usage.service';

describe('QuotaGuard', () => {
  const usage = {
    assertCanSend: jest.fn(),
    assertCanCreateSession: jest.fn(),
  };

  const reflector = { get: jest.fn() };
  const guard = new QuotaGuard(reflector as unknown as Reflector, usage as unknown as UsageService);

  const ctx = (workspaceId: string, action?: string) => {
    reflector.get.mockReturnValue(action);
    return {
      getHandler: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({ user: { workspaceId } }),
      }),
    } as never;
  };

  beforeEach(() => jest.clearAllMocks());

  it('passes when no quota action metadata', async () => {
    reflector.get.mockReturnValue(undefined);
    await expect(guard.canActivate(ctx('ws-1'))).resolves.toBe(true);
  });

  it('checks send quota', async () => {
    await guard.canActivate(ctx('ws-1', 'send'));
    expect(usage.assertCanSend).toHaveBeenCalledWith('ws-1');
  });

  it('checks session creation quota', async () => {
    await guard.canActivate(ctx('ws-1', 'create_session'));
    expect(usage.assertCanCreateSession).toHaveBeenCalledWith('ws-1');
  });

  it('propagates quota errors', async () => {
    usage.assertCanSend.mockRejectedValue(new ForbiddenException('quota_exhausted'));
    await expect(guard.canActivate(ctx('ws-1', 'send'))).rejects.toBeInstanceOf(ForbiddenException);
  });
});
