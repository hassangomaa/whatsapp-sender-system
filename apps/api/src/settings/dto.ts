import { IsOptional, IsString, IsUrl, MaxLength, ValidateIf } from 'class-validator';

export class UpdateSettingsDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  workspaceName?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @ValidateIf((_, v) => v != null && v !== '')
  @IsUrl({ require_tld: false }, { message: 'defaultWebhookUrl must be a valid URL' })
  defaultWebhookUrl?: string | null;
}
