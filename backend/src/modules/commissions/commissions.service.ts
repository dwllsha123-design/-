import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import {
  CreateCommissionRuleDto,
  UpdateCommissionStatusDto,
} from './dto/commission.dto';

@Injectable()
export class CommissionsService {
  constructor(private readonly prisma: PrismaService) {}

  listRules() {
    return this.prisma.commissionRule.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  createRule(dto: CreateCommissionRuleDto) {
    return this.prisma.commissionRule.create({
      data: {
        nameAr: dto.nameAr,
        type: dto.type ?? 'PERCENT',
        ratePercent: dto.ratePercent ?? 0,
        fixedAmount: dto.fixedAmount ?? 0,
        pageId: dto.pageId,
        agentUserId: dto.agentUserId,
        source: dto.source ?? 'FACEBOOK',
        isActive: dto.isActive ?? true,
      },
    });
  }

  async listEntries(user: AuthUser) {
    const isAdmin =
      user.roles.includes('super_admin') ||
      user.roles.includes('admin') ||
      user.permissions.includes('commissions.manage');

    return this.prisma.commissionEntry.findMany({
      where: isAdmin ? undefined : { agentUserId: user.id },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            totalAmount: true,
            source: true,
            pagePublicCode: true,
            agentPublicCode: true,
            createdAt: true,
          },
        },
        agent: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async updateStatus(id: string, dto: UpdateCommissionStatusDto) {
    const entry = await this.prisma.commissionEntry.findUnique({ where: { id } });
    if (!entry) throw new NotFoundException('العمولة غير موجودة');
    return this.prisma.commissionEntry.update({
      where: { id },
      data: {
        status: dto.status,
        paidAt: dto.status === 'PAID' ? new Date() : entry.paidAt,
      },
    });
  }

  /**
   * Accrue commission for an order inside an existing transaction when possible.
   */
  async accrueForOrder(
    tx: Prisma.TransactionClient,
    input: {
      orderId: string;
      orderTotal: number;
      source: string;
      agentUserId?: string | null;
      pageId?: string | null;
    },
  ) {
    if (!input.agentUserId) return null;

    const rules = await tx.commissionRule.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    const rule =
      rules.find(
        (r) =>
          r.agentUserId === input.agentUserId &&
          (!r.pageId || r.pageId === input.pageId) &&
          (!r.source || r.source === 'ALL' || r.source === input.source),
      ) ||
      rules.find(
        (r) =>
          !r.agentUserId &&
          r.pageId === input.pageId &&
          (!r.source || r.source === 'ALL' || r.source === input.source),
      ) ||
      rules.find(
        (r) =>
          !r.agentUserId &&
          !r.pageId &&
          (!r.source || r.source === 'ALL' || r.source === input.source),
      );

    if (!rule) return null;

    const rate = Number(rule.ratePercent || 0);
    const amount =
      rule.type === 'FIXED'
        ? Number(rule.fixedAmount || 0)
        : (input.orderTotal * rate) / 100;

    if (amount <= 0) return null;

    return tx.commissionEntry.upsert({
      where: {
        orderId_agentUserId: {
          orderId: input.orderId,
          agentUserId: input.agentUserId,
        },
      },
      create: {
        orderId: input.orderId,
        agentUserId: input.agentUserId,
        pageId: input.pageId,
        ruleId: rule.id,
        orderTotal: input.orderTotal,
        ratePercent: rate,
        amount,
        status: 'PENDING',
      },
      update: {
        amount,
        ratePercent: rate,
        orderTotal: input.orderTotal,
        ruleId: rule.id,
      },
    });
  }
}
