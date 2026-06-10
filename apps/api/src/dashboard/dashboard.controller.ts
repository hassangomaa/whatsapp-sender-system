import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { DashboardService } from './dashboard.service';

@Controller('api/v1/dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get()
  stats(@CurrentUser() user: { workspaceId: string }) {
    return this.dashboard.getStats(user.workspaceId);
  }
}
