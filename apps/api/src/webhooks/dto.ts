import { IsOptional, IsString, IsUrl } from 'class-validator';

export class TestWebhookDto {
  @IsOptional()
  @IsString()
  sessionId?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  url?: string;
}
