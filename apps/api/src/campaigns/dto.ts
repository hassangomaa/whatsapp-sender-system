import { Type } from 'class-transformer';
import { IsArray, IsOptional, IsString, MinLength, ValidateNested } from 'class-validator';

class RecipientDto {
  @IsString()
  phoneNumber!: string;

  @IsOptional()
  @IsString()
  name?: string;
}

export class CreateCampaignDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsString()
  sessionId!: string;

  @IsString()
  @MinLength(1)
  content!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecipientDto)
  recipients!: RecipientDto[];
}
