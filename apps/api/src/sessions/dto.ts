import { IsBoolean, IsOptional, IsString, IsUrl, MinLength } from 'class-validator';

export class CreateSessionDto {
  @IsString()
  @MinLength(1)
  name!: string;
}

export class UpdateScopesDto {
  @IsOptional()
  @IsBoolean()
  send?: boolean;

  @IsOptional()
  @IsBoolean()
  media?: boolean;

  @IsOptional()
  @IsBoolean()
  webhook?: boolean;

  @IsOptional()
  @IsString()
  webhookUrl?: string;
}
