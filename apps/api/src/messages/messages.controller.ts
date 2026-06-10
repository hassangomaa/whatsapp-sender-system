import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { QuotaGuard, RequireQuota } from '../common/quota.guard';
import { MessagesService } from './messages.service';
import { SendDashboardMessageDto } from './dto';

@Controller('api/v1/messages')
@UseGuards(JwtAuthGuard, QuotaGuard)
export class MessagesController {
  constructor(private readonly messages: MessagesService) {}

  @Get()
  list(
    @CurrentUser() user: { workspaceId: string },
    @Query('limit') limit?: string,
  ) {
    return this.messages.list(user.workspaceId, limit ? Number(limit) : 50);
  }

  @Post()
  @RequireQuota('send')
  send(
    @CurrentUser() user: { workspaceId: string },
    @Body() dto: SendDashboardMessageDto,
  ) {
    return this.messages.send(user.workspaceId, dto.sessionId, dto.phoneNumber, dto.content);
  }
}
