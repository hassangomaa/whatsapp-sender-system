import { IsOptional, IsString, MinLength } from 'class-validator';

export class SendMessageDto {
  @IsString()
  phoneNumber!: string;

  @IsString()
  @MinLength(1)
  content!: string;
}

export class SendMediaDto {
  @IsString()
  phoneNumber!: string;

  @IsString()
  mediaType!: string;

  @IsOptional()
  @IsString()
  mediaUrl?: string;

  @IsOptional()
  @IsString()
  caption?: string;
}
