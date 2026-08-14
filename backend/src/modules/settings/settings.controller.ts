import { Body, Controller, Get, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsObject } from 'class-validator';
import { PrismaService } from '../../prisma/prisma.service';
import { RequirePermissions } from '../../common/decorators/auth.decorators';
import { PERMISSIONS } from '../../common/permissions';
import { Public } from '../../common/decorators/auth.decorators';

class UpdateSettingsDto {
  @IsObject()
  settings!: Record<string, string>;
}

@ApiTags('Settings')
@Controller('settings')
export class SettingsController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get('public')
  async publicSettings() {
    const keys = [
      'app.name',
      'app.locale',
      'app.currency',
      'app.currency_symbol',
      'app.timezone',
      'company.city',
      'company.country',
      'company.phone_primary',
      'company.phone_secondary',
      'company.address',
    ];
    const rows = await this.prisma.setting.findMany({
      where: { key: { in: keys } },
    });
    return Object.fromEntries(rows.map((r) => [r.key, r.value]));
  }

  @ApiBearerAuth()
  @Get()
  @RequirePermissions(PERMISSIONS.SETTINGS_MANAGE)
  async all() {
    const rows = await this.prisma.setting.findMany({ orderBy: { key: 'asc' } });
    return Object.fromEntries(rows.map((r) => [r.key, r.value]));
  }

  @ApiBearerAuth()
  @Put()
  @RequirePermissions(PERMISSIONS.SETTINGS_MANAGE)
  async update(@Body() dto: UpdateSettingsDto) {
    const entries = Object.entries(dto.settings);
    await this.prisma.$transaction(
      entries.map(([key, value]) =>
        this.prisma.setting.upsert({
          where: { key },
          create: { key, value, group: key.split('.')[0] || 'general' },
          update: { value },
        }),
      ),
    );
    return this.all();
  }
}
