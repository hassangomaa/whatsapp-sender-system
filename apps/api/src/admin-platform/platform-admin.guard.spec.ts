import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PlatformAdminGuard } from './platform-admin.guard';

describe('PlatformAdminGuard', () => {
  const prisma = {
    client: {
      user: { findUnique: jest.fn() },
    },
  };

  const guard = new PlatformAdminGuard({ client: prisma.client } as never);

  beforeEach(() => {
    process.env.PLATFORM_ADMIN_EMAILS = 'admin@test.com';
    jest.spyOn(Object.getPrototypeOf(PlatformAdminGuard.prototype), 'canActivate').mockResolvedValue(true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('allows allowlisted admin email', async () => {
    prisma.client.user.findUnique.mockResolvedValue({ email: 'admin@test.com' });
    const ctx = {
      switchToHttp: () => ({
        getRequest: () => ({ user: { userId: 'u1' }, platformAdmin: undefined }),
      }),
    } as unknown as ExecutionContext;

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  it('denies non-admin email', async () => {
    prisma.client.user.findUnique.mockResolvedValue({ email: 'user@test.com' });
    const ctx = {
      switchToHttp: () => ({
        getRequest: () => ({ user: { userId: 'u1' } }),
      }),
    } as unknown as ExecutionContext;

    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(ForbiddenException);
  });
});
