import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PublicApiService } from './public-api.service';
import {
  JoinGroupDto,
  ResolveChannelDto,
  SendChannelMediaDto,
  SendChannelMessageDto,
  SendGroupMediaDto,
  SendGroupMessageDto,
  SendMediaDto,
  SendMessageDto,
} from './dto';

@Controller('api/v1/whatsapp/public')
export class PublicApiController {
  constructor(private readonly publicApi: PublicApiService) {}

  private parseLimit(limit?: string): number | undefined {
    if (!limit) {
      return undefined;
    }
    const parsed = Number(limit);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  @Post('message/send')
  @HttpCode(200)
  sendMessage(
    @Headers('x-api-key') apiKey: string,
    @Headers('idempotency-key') idempotencyKey: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.publicApi.sendMessage(apiKey, idempotencyKey, {
      phoneNumber: dto.phoneNumber,
      content: dto.content,
    });
  }

  @Get('message/:messageId')
  getMessage(@Headers('x-api-key') apiKey: string, @Param('messageId') messageId: string) {
    return this.publicApi.getMessage(apiKey, messageId);
  }

  @Get('messages')
  listMessages(
    @Headers('x-api-key') apiKey: string,
    @Query('chatJid') chatJid?: string,
    @Query('direction') direction?: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.publicApi.listChatMessages(apiKey, {
      chatJid,
      direction: direction === 'inbound' || direction === 'outbound' ? direction : undefined,
      limit: this.parseLimit(limit),
      cursor,
    });
  }

  @Get('message/list')
  listMessagesLegacyList(
    @Headers('x-api-key') apiKey: string,
    @Query('chatJid') chatJid?: string,
    @Query('direction') direction?: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.publicApi.listChatMessages(apiKey, {
      chatJid,
      direction: direction === 'inbound' || direction === 'outbound' ? direction : undefined,
      limit: this.parseLimit(limit),
      cursor,
    });
  }

  @Get('message/history')
  listMessagesLegacyHistory(
    @Headers('x-api-key') apiKey: string,
    @Query('chatJid') chatJid?: string,
    @Query('direction') direction?: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.publicApi.listChatMessages(apiKey, {
      chatJid,
      direction: direction === 'inbound' || direction === 'outbound' ? direction : undefined,
      limit: this.parseLimit(limit),
      cursor,
    });
  }

  @Get('groups/messages')
  listGroupMessages(
    @Headers('x-api-key') apiKey: string,
    @Query('groupJid') groupJid?: string,
    @Query('inviteCode') inviteCode?: string,
    @Query('direction') direction?: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.publicApi.listGroupMessages(apiKey, {
      groupJid,
      inviteCode,
      direction: direction === 'inbound' || direction === 'outbound' ? direction : undefined,
      limit: this.parseLimit(limit),
      cursor,
    });
  }

  @Get('groups/:groupJid/messages')
  listGroupMessagesByPath(
    @Headers('x-api-key') apiKey: string,
    @Param('groupJid') groupJid: string,
    @Query('direction') direction?: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.publicApi.listGroupMessages(apiKey, {
      groupJid,
      direction: direction === 'inbound' || direction === 'outbound' ? direction : undefined,
      limit: this.parseLimit(limit),
      cursor,
    });
  }

  @Get('chats/:chatJid/messages')
  listChatMessagesByPath(
    @Headers('x-api-key') apiKey: string,
    @Param('chatJid') chatJid: string,
    @Query('direction') direction?: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.publicApi.listChatMessages(apiKey, {
      chatJid,
      direction: direction === 'inbound' || direction === 'outbound' ? direction : undefined,
      limit: this.parseLimit(limit),
      cursor,
    });
  }

  @Get('chats')
  listChats(@Headers('x-api-key') apiKey: string, @Query('limit') limit?: string) {
    return this.publicApi.listChats(apiKey, { limit: this.parseLimit(limit) });
  }

  @Post('media/send')
  @UseInterceptors(FileInterceptor('file'))
  sendMedia(
    @Headers('x-api-key') apiKey: string,
    @Headers('idempotency-key') idempotencyKey: string,
    @Body() dto: SendMediaDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.publicApi.sendMedia(apiKey, idempotencyKey, {
      phoneNumber: dto.phoneNumber,
      mediaType: dto.mediaType,
      mediaUrl: dto.mediaUrl,
      caption: dto.caption,
      file,
    });
  }

  @Get('groups')
  listGroups(@Headers('x-api-key') apiKey: string) {
    return this.publicApi.listGroups(apiKey);
  }

  @Post('groups/join')
  @HttpCode(200)
  joinGroup(@Headers('x-api-key') apiKey: string, @Body() dto: JoinGroupDto) {
    return this.publicApi.joinGroup(apiKey, dto.inviteCode);
  }

  @Post('groups/message/send')
  @HttpCode(200)
  sendGroupMessage(
    @Headers('x-api-key') apiKey: string,
    @Headers('idempotency-key') idempotencyKey: string,
    @Body() dto: SendGroupMessageDto,
  ) {
    return this.publicApi.sendGroupMessage(apiKey, idempotencyKey, {
      groupJid: dto.groupJid,
      inviteCode: dto.inviteCode,
      content: dto.content,
    });
  }

  @Post('groups/media/send')
  @UseInterceptors(FileInterceptor('file'))
  sendGroupMedia(
    @Headers('x-api-key') apiKey: string,
    @Headers('idempotency-key') idempotencyKey: string,
    @Body() dto: SendGroupMediaDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.publicApi.sendGroupMedia(apiKey, idempotencyKey, {
      groupJid: dto.groupJid,
      inviteCode: dto.inviteCode,
      mediaType: dto.mediaType,
      mediaUrl: dto.mediaUrl,
      caption: dto.caption,
      fileName: dto.fileName,
      file,
    });
  }

  @Post('channels/resolve')
  @HttpCode(200)
  resolveChannel(@Headers('x-api-key') apiKey: string, @Body() dto: ResolveChannelDto) {
    return this.publicApi.resolveChannel(apiKey, dto.inviteCode);
  }

  @Post('channels/message/send')
  @HttpCode(200)
  sendChannelMessage(
    @Headers('x-api-key') apiKey: string,
    @Headers('idempotency-key') idempotencyKey: string,
    @Body() dto: SendChannelMessageDto,
  ) {
    return this.publicApi.sendChannelMessage(apiKey, idempotencyKey, {
      newsletterJid: dto.newsletterJid,
      inviteCode: dto.inviteCode,
      content: dto.content,
    });
  }

  @Post('channels/media/send')
  @UseInterceptors(FileInterceptor('file'))
  sendChannelMedia(
    @Headers('x-api-key') apiKey: string,
    @Headers('idempotency-key') idempotencyKey: string,
    @Body() dto: SendChannelMediaDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.publicApi.sendChannelMedia(apiKey, idempotencyKey, {
      newsletterJid: dto.newsletterJid,
      inviteCode: dto.inviteCode,
      mediaType: dto.mediaType,
      mediaUrl: dto.mediaUrl,
      caption: dto.caption,
      file,
    });
  }
}
