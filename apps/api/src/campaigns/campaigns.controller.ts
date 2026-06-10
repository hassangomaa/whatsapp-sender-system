import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { CampaignsService } from './campaigns.service';
import { CreateCampaignDto } from './dto';

@Controller('api/v1/campaigns')
@UseGuards(JwtAuthGuard)
export class CampaignsController {
  constructor(private readonly campaigns: CampaignsService) {}

  @Get()
  list(@CurrentUser() user: { workspaceId: string }) {
    return this.campaigns.list(user.workspaceId);
  }

  @Get(':id')
  get(@CurrentUser() user: { workspaceId: string }, @Param('id') id: string) {
    return this.campaigns.get(user.workspaceId, id);
  }

  @Post()
  create(@CurrentUser() user: { workspaceId: string }, @Body() dto: CreateCampaignDto) {
    return this.campaigns.create(user.workspaceId, dto);
  }

  @Post(':id/start')
  start(@CurrentUser() user: { workspaceId: string }, @Param('id') id: string) {
    return this.campaigns.start(user.workspaceId, id);
  }

  @Post(':id/pause')
  pause(@CurrentUser() user: { workspaceId: string }, @Param('id') id: string) {
    return this.campaigns.pause(user.workspaceId, id);
  }

  @Post(':id/cancel')
  cancel(@CurrentUser() user: { workspaceId: string }, @Param('id') id: string) {
    return this.campaigns.cancel(user.workspaceId, id);
  }
}
