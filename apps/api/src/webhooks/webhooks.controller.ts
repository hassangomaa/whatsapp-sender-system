import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { WebhooksService } from './webhooks.service';
import { TestWebhookDto } from './dto';

@Controller('api/v1/webhooks')
@UseGuards(JwtAuthGuard)
export class WebhooksController {
  constructor(private readonly webhooks: WebhooksService) {}

  @Get('deliveries')
  list(
    @CurrentUser() user: { workspaceId: string },
    @Query('limit') limit?: string,
    @Query('filter') filter?: 'all' | 'success' | 'failed',
  ) {
    return this.webhooks.listDeliveries(
      user.workspaceId,
      limit ? Number(limit) : 50,
      filter ?? 'all',
    );
  }

  @Get('deliveries/:id')
  get(@CurrentUser() user: { workspaceId: string }, @Param('id') id: string) {
    return this.webhooks.getDelivery(user.workspaceId, id);
  }

  @Post('deliveries/:id/retry')
  retry(@CurrentUser() user: { workspaceId: string }, @Param('id') id: string) {
    return this.webhooks.retryDelivery(user.workspaceId, id);
  }

  @Post('test')
  test(
    @CurrentUser() user: { userId: string; workspaceId: string },
    @Body() dto: TestWebhookDto,
  ) {
    return this.webhooks.testWebhook(user.userId, user.workspaceId, dto);
  }
}
