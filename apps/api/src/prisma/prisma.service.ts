import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { prisma } from '@whatsapp-sender/database';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  client = prisma;

  async onModuleInit() {
    await this.client.$connect();
  }

  async onModuleDestroy() {
    await this.client.$disconnect();
  }
}
