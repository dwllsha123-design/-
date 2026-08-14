import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Injectable, Module } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RequirePermissions } from '../../common/decorators/auth.decorators';
import { PERMISSIONS } from '../../common/permissions';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  list(filters: {
    action?: string;
    entityType?: string;
    userId?: string;
    from?: string;
    to?: string;
    limit?: number;
  }) {
    return this.prisma.auditLog.findMany({
      where: {
        ...(filters.action ? { action: { contains: filters.action } } : {}),
        ...(filters.entityType ? { entityType: filters.entityType } : {}),
        ...(filters.userId ? { userId: filters.userId } : {}),
        ...(filters.from || filters.to
          ? {
              createdAt: {
                ...(filters.from ? { gte: new Date(filters.from) } : {}),
                ...(filters.to ? { lte: new Date(filters.to) } : {}),
              },
            }
          : {}),
      },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: filters.limit || 100,
    });
  }
}

@ApiTags('Audit')
@ApiBearerAuth()
@Controller('audit-logs')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.AUDIT_VIEW)
  list(
    @Query('action') action?: string,
    @Query('entityType') entityType?: string,
    @Query('userId') userId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
  ) {
    return this.audit.list({
      action,
      entityType,
      userId,
      from,
      to,
      limit: limit ? Number(limit) : 100,
    });
  }
}

@Module({
  controllers: [AuditController],
  providers: [AuditService],
})
export class AuditModule {}
