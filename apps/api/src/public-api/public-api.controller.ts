import {
  Body,
  Controller,
  Headers,
  HttpCode,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PublicApiService } from './public-api.service';
import { SendMediaDto, SendMessageDto } from './dto';

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
    return this.publicApi.sendMessage(apiKey, idempotencyKey, dto.phoneNumber, dto.content);
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
}
