import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { StatusService } from './status.service';

@Controller('api/v1/status')
@UseGuards(JwtAuthGuard)
export class StatusController {
  constructor(private readonly status: StatusService) {}

  @Get()
  summary(@CurrentUser() user: { workspaceId: string }) {
    return this.status.getSummary(user.workspaceId);
  }
}
