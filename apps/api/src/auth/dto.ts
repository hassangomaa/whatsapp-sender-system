import { IsEmail, IsOptional, IsString, MinLength, Length } from 'class-validator';

export class RegisterDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}

export class LoginDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  password?: string;
}

export class RequestOtpDto {
  @IsString()
  phone!: string;
}

export class VerifyOtpDto {
  @IsString()
  phone!: string;

  @IsString()
  @Length(6, 6)
  code!: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;
}
