import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { QuotaGuard, RequireQuota } from '../common/quota.guard';
import { MessagesService } from './messages.service';
import { SendDashboardMediaDto, SendDashboardMessageDto } from './dto';

@Controller('api/v1/messages')
@UseGuards(JwtAuthGuard, QuotaGuard)
export class MessagesController {
  constructor(private readonly messages: MessagesService) {}

  @Get()
  list(
    @CurrentUser() user: { workspaceId: string },
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.messages.list(user.workspaceId, limit ? Number(limit) : 50, cursor);
  }

  @Post()
  @RequireQuota('send')
  send(
    @CurrentUser() user: { workspaceId: string },
    @Body() dto: SendDashboardMessageDto,
  ) {
    return this.messages.send(user.workspaceId, dto.sessionId, dto.phoneNumber, dto.content);
  }

  @Post('media')
  @RequireQuota('send')
  sendMedia(
    @CurrentUser() user: { workspaceId: string },
    @Body() dto: SendDashboardMediaDto,
  ) {
    return this.messages.sendMedia(user.workspaceId, dto.sessionId, dto.phoneNumber, {
      mediaType: dto.mediaType,
      mediaBase64: dto.mediaBase64,
      caption: dto.caption,
      filename: dto.filename,
    });
  }
}
