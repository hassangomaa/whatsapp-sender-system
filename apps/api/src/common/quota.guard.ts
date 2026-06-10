import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UsageService } from './usage.service';

export type QuotaAction = 'send' | 'create_session';

export const QUOTA_ACTION_KEY = 'quota_action';
export const RequireQuota = (action: QuotaAction) => SetMetadata(QUOTA_ACTION_KEY, action);

@Injectable()
export class QuotaGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly usage: UsageService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const action = this.reflector.get<QuotaAction | undefined>(
      QUOTA_ACTION_KEY,
      context.getHandler(),
    );
    if (!action) return true;

    const request = context.switchToHttp().getRequest();
    const workspaceId = request.user?.workspaceId as string | undefined;
    if (!workspaceId) return true;

    if (action === 'send') {
      await this.usage.assertCanSend(workspaceId);
    } else if (action === 'create_session') {
      await this.usage.assertCanCreateSession(workspaceId);
    }

    return true;
  }
}
