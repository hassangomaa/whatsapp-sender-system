import { IsString, MinLength } from 'class-validator';

export class ActivatePlanDto {
  @IsString()
  planSlug!: string;
}

export class RedeemCodeDto {
  @IsString()
  @MinLength(3)
  code!: string;
}
