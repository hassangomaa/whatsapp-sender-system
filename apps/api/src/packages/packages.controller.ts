import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { PackagesService } from './packages.service';
import { ActivatePlanDto, RedeemCodeDto } from './dto';

@Controller('api/v1/packages')
@UseGuards(JwtAuthGuard)
export class PackagesController {
  constructor(private readonly packages: PackagesService) {}

  @Get('plans')
  listPlans() {
    return this.packages.listPlans();
  }

  @Get()
  workspacePackage(@CurrentUser() user: { workspaceId: string }) {
    return this.packages.getWorkspacePackage(user.workspaceId);
  }

  @Post('activate')
  activate(
    @CurrentUser() user: { workspaceId: string },
    @Body() dto: ActivatePlanDto,
  ) {
    return this.packages.activatePlan(user.workspaceId, dto.planSlug);
  }

  @Post('redeem')
  redeem(@CurrentUser() user: { workspaceId: string }, @Body() dto: RedeemCodeDto) {
    return this.packages.redeemCode(user.workspaceId, dto.code);
  }
}
