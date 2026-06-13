import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from '../prisma/prisma.service';
import { isPlatformAdminEmail } from './platform-config.service';

@Injectable()
export class PlatformAdminGuard extends AuthGuard('jwt') implements CanActivate {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const authenticated = (await super.canActivate(context)) as boolean;
    if (!authenticated) return false;

    const request = context.switchToHttp().getRequest();
    const userId = request.user?.userId as string | undefined;
    if (!userId) {
      throw new UnauthorizedException();
    }

    const user = await this.prisma.client.user.findUnique({ where: { id: userId } });
    if (!isPlatformAdminEmail(user?.email)) {
      throw new ForbiddenException('Platform admin access required');
    }

    request.platformAdmin = { userId, email: user?.email ?? null };
    return true;
  }
}
