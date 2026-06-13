import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdatePlatformSettingsDto {
  @IsOptional()
  @IsString()
  otpSessionId?: string | null;

  @IsOptional()
  @IsString()
  adminNotifySessionId?: string | null;

  @IsOptional()
  @IsString()
  adminPhone?: string | null;

  @IsOptional()
  @IsBoolean()
  adminNotifyEnabled?: boolean;
}

export class TestOtpDto {
  @IsString()
  phone!: string;
}

export class CreatePlatformSessionDto {
  @IsString()
  name!: string;
}
