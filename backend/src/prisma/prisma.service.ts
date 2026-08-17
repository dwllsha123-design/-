import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    await this.$connect();
    const url = process.env.DATABASE_URL || '';
    if (url.startsWith('file:')) {
      await this.$queryRawUnsafe('PRAGMA journal_mode=WAL');
      await this.$queryRawUnsafe('PRAGMA busy_timeout=5000');
      await this.$queryRawUnsafe('PRAGMA foreign_keys=ON');
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
