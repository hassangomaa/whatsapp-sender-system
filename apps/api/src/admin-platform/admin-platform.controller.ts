import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { PlatformAdminGuard } from './platform-admin.guard';
import { AdminPlatformService } from './admin-platform.service';
import { CreatePlatformSessionDto, TestOtpDto, UpdatePlatformSettingsDto } from './dto';

@Controller('api/v1/admin/platform')
@UseGuards(PlatformAdminGuard)
export class AdminPlatformController {
  constructor(private readonly adminPlatform: AdminPlatformService) {}

  @Get()
  get(@Req() req: { platformAdmin: { userId: string } }) {
    return this.adminPlatform.getPlatform(req.platformAdmin.userId);
  }

  @Patch()
  update(
    @Req() req: { platformAdmin: { userId: string } },
    @Body() dto: UpdatePlatformSettingsDto,
  ) {
    return this.adminPlatform.updatePlatform(req.platformAdmin.userId, dto);
  }

  @Get('sessions')
  sessions(@Req() req: { platformAdmin: { userId: string } }) {
    return this.adminPlatform.listSessions(req.platformAdmin.userId);
  }

  @Post('test-otp')
  testOtp(@Body() dto: TestOtpDto) {
    return this.adminPlatform.testOtp(dto);
  }

  @Post('sessions')
  createSession(
    @Req() req: { platformAdmin: { userId: string } },
    @Body() dto: CreatePlatformSessionDto,
  ) {
    return this.adminPlatform.createSession(req.platformAdmin.userId, dto.name);
  }

  @Post('sessions/:id/init')
  initSession(
    @Req() req: { platformAdmin: { userId: string } },
    @Param('id') id: string,
  ) {
    return this.adminPlatform.initSession(req.platformAdmin.userId, id);
  }

  @Get('sessions/:id')
  getSession(
    @Req() req: { platformAdmin: { userId: string } },
    @Param('id') id: string,
  ) {
    return this.adminPlatform.getSession(req.platformAdmin.userId, id);
  }
}
