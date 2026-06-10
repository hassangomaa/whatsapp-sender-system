import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import Redis from 'ioredis';
import { REDIS_CHANNELS } from '@whatsapp-sender/contracts';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { QuotaGuard, RequireQuota } from '../common/quota.guard';
import { SessionsService } from './sessions.service';
import { CreateSessionDto, UpdateScopesDto } from './dto';

@Controller('api/v1/sessions')
@UseGuards(JwtAuthGuard, QuotaGuard)
export class SessionsController {
  private readonly redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379');

  constructor(private readonly sessions: SessionsService) {}

  @Get()
  list(@CurrentUser() user: { workspaceId: string }) {
    return this.sessions.list(user.workspaceId);
  }

  @Get(':id')
  get(@CurrentUser() user: { workspaceId: string }, @Param('id') id: string) {
    return this.sessions.get(user.workspaceId, id);
  }

  @Post()
  @RequireQuota('create_session')
  create(@CurrentUser() user: { workspaceId: string }, @Body() dto: CreateSessionDto) {
    return this.sessions.create(user.workspaceId, dto.name);
  }

  @Post(':id/init')
  init(@CurrentUser() user: { workspaceId: string }, @Param('id') id: string) {
    return this.sessions.init(user.workspaceId, id);
  }

  @Post(':id/disconnect')
  disconnect(@CurrentUser() user: { workspaceId: string }, @Param('id') id: string) {
    return this.sessions.disconnect(user.workspaceId, id);
  }

  @Patch(':id/scopes')
  updateScopes(
    @CurrentUser() user: { workspaceId: string },
    @Param('id') id: string,
    @Body() dto: UpdateScopesDto,
  ) {
    return this.sessions.updateScopes(user.workspaceId, id, dto);
  }

  @Get(':id/qr/stream')
  async qrStream(
    @CurrentUser() user: { workspaceId: string },
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const session = await this.sessions.get(user.workspaceId, id);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const send = (data: object) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    send({
      type: 'snapshot',
      sessionId: id,
      status: session.status,
      qr: session.qrCode,
      phone: session.phone,
      mock: process.env.BAILEYS_MOCK === '1',
    });

    const channel = REDIS_CHANNELS.sessionEvent(id);
    const subscriber = this.redis.duplicate();
    await subscriber.subscribe(channel);

    subscriber.on('message', (_ch, message) => {
      send(JSON.parse(message));
    });

    const keepAlive = setInterval(() => res.write(': keepalive\n\n'), 15000);

    res.on('close', async () => {
      clearInterval(keepAlive);
      await subscriber.unsubscribe(channel);
      await subscriber.quit();
    });
  }
}
