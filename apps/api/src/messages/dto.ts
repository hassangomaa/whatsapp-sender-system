import { IsOptional, IsString, MinLength } from 'class-validator';

export class SendDashboardMessageDto {
  @IsString()
  sessionId!: string;

  @IsString()
  phoneNumber!: string;

  @IsString()
  @MinLength(1)
  content!: string;
}

export class SendDashboardMediaDto {
  @IsString()
  sessionId!: string;

  @IsString()
  phoneNumber!: string;

  @IsString()
  mediaType!: string;

  @IsString()
  mediaBase64!: string;

  @IsOptional()
  @IsString()
  caption?: string;

  @IsOptional()
  @IsString()
  filename?: string;
}
