import { IsOptional, IsString, MinLength, ValidateIf } from 'class-validator';

export class SendMessageDto {
  @IsString()
  phoneNumber!: string;

  @IsString()
  @MinLength(1)
  content!: string;
}

export class SendGroupMessageDto {
  @ValidateIf((o) => !o.inviteCode)
  @IsString()
  groupJid?: string;

  @ValidateIf((o) => !o.groupJid)
  @IsString()
  @MinLength(5)
  inviteCode?: string;

  @IsString()
  @MinLength(1)
  content!: string;
}

export class SendChannelMessageDto {
  @ValidateIf((o) => !o.inviteCode)
  @IsString()
  newsletterJid?: string;

  @ValidateIf((o) => !o.newsletterJid)
  @IsString()
  @MinLength(5)
  inviteCode?: string;

  @IsString()
  @MinLength(1)
  content!: string;
}

export class JoinGroupDto {
  @IsString()
  @MinLength(5)
  inviteCode!: string;
}

export class ResolveChannelDto {
  @IsString()
  @MinLength(5)
  inviteCode!: string;
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

export class SendGroupMediaDto {
  @ValidateIf((o) => !o.inviteCode)
  @IsString()
  groupJid?: string;

  @ValidateIf((o) => !o.groupJid)
  @IsString()
  @MinLength(5)
  inviteCode?: string;

  @IsString()
  mediaType!: string;

  @IsOptional()
  @IsString()
  mediaUrl?: string;

  @IsOptional()
  @IsString()
  caption?: string;
}

export class SendChannelMediaDto {
  @ValidateIf((o) => !o.inviteCode)
  @IsString()
  newsletterJid?: string;

  @ValidateIf((o) => !o.newsletterJid)
  @IsString()
  @MinLength(5)
  inviteCode?: string;

  @IsString()
  mediaType!: string;

  @IsOptional()
  @IsString()
  mediaUrl?: string;

  @IsOptional()
  @IsString()
  caption?: string;
}
