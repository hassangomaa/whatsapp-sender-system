import { IsString, MinLength } from 'class-validator';

export class SendDashboardMessageDto {
  @IsString()
  sessionId!: string;

  @IsString()
  phoneNumber!: string;

  @IsString()
  @MinLength(1)
  content!: string;
}
