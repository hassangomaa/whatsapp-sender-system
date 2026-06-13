import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Post,
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
