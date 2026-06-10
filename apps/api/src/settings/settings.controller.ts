import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { SettingsService } from './settings.service';
import { UpdateSettingsDto } from './dto';

@Controller('api/v1/settings')
@UseGuards(JwtAuthGuard)
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get()
  get(@CurrentUser() user: { userId: string; workspaceId: string }) {
    return this.settings.get(user.userId, user.workspaceId);
  }

  @Patch()
  update(
    @CurrentUser() user: { userId: string; workspaceId: string },
    @Body() dto: UpdateSettingsDto,
  ) {
    return this.settings.update(user.userId, user.workspaceId, dto);
  }
}
