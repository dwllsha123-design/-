import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Injectable, Module } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RequirePermissions } from '../../common/decorators/auth.decorators';
import { PERMISSIONS } from '../../common/permissions';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  private range(daysAgo: number) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - daysAgo);
    return d;
  }

  private async periodStats(from: Date) {
    const [orders, sales] = await Promise.all([
      this.prisma.order.count({
        where: { createdAt: { gte: from }, status: { not: 'CANCELLED' } },
      }),
      this.prisma.order.aggregate({
        where: { createdAt: { gte: from }, status: { not: 'CANCELLED' } },
        _sum: { totalAmount: true },
      }),
    ]);
    return { orders, sales: Number(sales._sum.totalAmount || 0) };
  }

  async dashboard() {
    const startOfDay = this.range(0);
    const startOfWeek = this.range(6);
    const startOfMonth = this.range(29);

    const [
      today,
      week,
      month,
      pendingOrders,
      stockItems,
      customersCount,
      productsCount,
      bySource,
      recentOrders,
      pendingMarketers,
    ] = await Promise.all([
      this.periodStats(startOfDay),
      this.periodStats(startOfWeek),
      this.periodStats(startOfMonth),
      this.prisma.order.count({
        where: {
          status: {
            in: [
              'NEW',
              'CONFIRMED',
              'PREPARING',
              'READY',
              'ASSIGNED',
              'OUT_FOR_DELIVERY',
            ],
          },
        },
      }),
      this.prisma.stockItem.findMany({ take: 1000 }),
      this.prisma.customer.count(),
      this.prisma.product.count({ where: { status: 'ACTIVE' } }),
      this.prisma.order.groupBy({
        by: ['source'],
        where: { createdAt: { gte: startOfDay }, status: { not: 'CANCELLED' } },
        _count: { _all: true },
        _sum: { totalAmount: true },
      }),
      this.prisma.order.findMany({
        orderBy: { createdAt: 'desc' },
        take: 8,
        select: {
          id: true,
          orderNumber: true,
          source: true,
          status: true,
          totalAmount: true,
          shippingName: true,
          createdAt: true,
        },
      }),
      this.prisma.user.count({
        where: {
          status: 'PENDING',
          roles: { some: { role: { code: 'sales_agent' } } },
        },
      }),
    ]);

    const lowStockItems = stockItems.filter(
      (i) => i.quantityOnHand <= i.reorderLevel,
    );

    return {
      currency: 'LYD',
      today,
      week,
      month,
      pendingOrders,
      lowStock: lowStockItems.length,
      pendingMarketers,
      customersCount,
      productsCount,
      bySource: bySource.map((row) => ({
        source: row.source,
        count: row._count._all,
        total: Number(row._sum.totalAmount || 0),
      })),
      recentOrders,
    };
  }

  async salesSummary(from?: string, to?: string) {
    const where: {
      createdAt?: { gte?: Date; lte?: Date };
      status?: { not: 'CANCELLED' };
    } = { status: { not: 'CANCELLED' } };
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    const [total, bySource, byStatus] = await Promise.all([
      this.prisma.order.aggregate({
        where,
        _sum: { totalAmount: true },
        _count: { _all: true },
      }),
      this.prisma.order.groupBy({
        by: ['source'],
        where,
        _count: { _all: true },
        _sum: { totalAmount: true },
      }),
      this.prisma.order.groupBy({
        by: ['status'],
        where,
        _count: { _all: true },
      }),
    ]);

    return {
      currency: 'LYD',
      orders: total._count._all,
      sales: Number(total._sum.totalAmount || 0),
      bySource: bySource.map((r) => ({
        source: r.source,
        count: r._count._all,
        total: Number(r._sum.totalAmount || 0),
      })),
      byStatus: byStatus.map((r) => ({
        status: r.status,
        count: r._count._all,
      })),
    };
  }

  async byPage(from?: string, to?: string) {
    const where: {
      createdAt?: { gte?: Date; lte?: Date };
      status?: { not: 'CANCELLED' };
    } = { status: { not: 'CANCELLED' } };
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    const grouped = await this.prisma.order.groupBy({
      by: ['facebookPageId', 'pagePublicCode'],
      where,
      _count: { _all: true },
      _sum: { totalAmount: true },
    });

    const pageIds = grouped
      .map((g) => g.facebookPageId)
      .filter((id): id is string => Boolean(id));
    const pages = await this.prisma.facebookPage.findMany({
      where: { id: { in: pageIds } },
      select: { id: true, name: true, publicCode: true },
    });
    const byId = Object.fromEntries(pages.map((p) => [p.id, p]));

    return {
      currency: 'LYD',
      pages: grouped
        .map((g) => {
          const page = g.facebookPageId ? byId[g.facebookPageId] : null;
          return {
            facebookPageId: g.facebookPageId,
            pagePublicCode: g.pagePublicCode ?? page?.publicCode ?? null,
            pageName:
              page?.name ||
              (g.facebookPageId ? 'صفحة محذوفة' : 'بدون صفحة / مباشر'),
            orders: g._count._all,
            sales: Number(g._sum.totalAmount || 0),
          };
        })
        .sort((a, b) => b.sales - a.sales),
    };
  }

  async byAgent(from?: string, to?: string) {
    const where: {
      createdAt?: { gte?: Date; lte?: Date };
      status?: { not: 'CANCELLED' };
      salesAgentId?: { not: null };
    } = {
      status: { not: 'CANCELLED' },
      salesAgentId: { not: null },
    };
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    const grouped = await this.prisma.order.groupBy({
      by: ['salesAgentId'],
      where,
      _count: { _all: true },
      _sum: { totalAmount: true },
    });

    const ids = grouped
      .map((g) => g.salesAgentId)
      .filter((id): id is string => Boolean(id));
    const agents = await this.prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, phone: true, email: true },
    });
    const byId = Object.fromEntries(agents.map((a) => [a.id, a]));

    return {
      currency: 'LYD',
      agents: grouped
        .map((g) => {
          const agent = g.salesAgentId ? byId[g.salesAgentId] : null;
          return {
            salesAgentId: g.salesAgentId,
            agentName: agent?.name || 'مندوب محذوف',
            phone: agent?.phone || null,
            orders: g._count._all,
            sales: Number(g._sum.totalAmount || 0),
          };
        })
        .sort((a, b) => b.orders - a.orders),
    };
  }
}

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('dashboard')
  @RequirePermissions(PERMISSIONS.REPORTS_VIEW)
  dashboard() {
    return this.reportsService.dashboard();
  }

  @Get('sales')
  @RequirePermissions(PERMISSIONS.REPORTS_VIEW)
  sales(@Query('from') from?: string, @Query('to') to?: string) {
    return this.reportsService.salesSummary(from, to);
  }

  @Get('by-page')
  @RequirePermissions(PERMISSIONS.REPORTS_VIEW)
  byPage(@Query('from') from?: string, @Query('to') to?: string) {
    return this.reportsService.byPage(from, to);
  }

  @Get('by-agent')
  @RequirePermissions(PERMISSIONS.REPORTS_VIEW)
  byAgent(@Query('from') from?: string, @Query('to') to?: string) {
    return this.reportsService.byAgent(from, to);
  }
}

@Module({
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
