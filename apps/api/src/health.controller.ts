import { Controller, Get } from '@nestjs/common';
import { WHATSAPP_QR_REFRESH_SECONDS } from '@whatsapp-sender/contracts';

@Controller()
export class HealthController {
  @Get('health')
  health() {
    return {
      status: 'ok',
      service: 'whatsapp-sender-api',
      capabilities: {
        baileysMock: process.env.BAILEYS_MOCK === '1',
        qrRefreshSeconds: WHATSAPP_QR_REFRESH_SECONDS,
      },
    };
  }
}
