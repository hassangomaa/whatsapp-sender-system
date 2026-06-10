import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { OtpService } from './otp.service';
import { LoginDto, RegisterDto, RequestOtpDto, VerifyOtpDto } from './dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CurrentUser } from './current-user.decorator';

@Controller('api/v1/auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly otp: OtpService,
  ) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Post('otp/request')
  requestOtp(@Body() dto: RequestOtpDto) {
    return this.otp.requestOtp(dto);
  }

  @Post('otp/verify')
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.otp.verifyOtp(dto);
  }

  @Get('otp/peek')
  peekOtp(@Query('phone') phone: string) {
    return this.otp.peekOtp(phone);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: { userId: string; workspaceId: string }) {
    return this.auth.me(user.userId, user.workspaceId);
  }
}
