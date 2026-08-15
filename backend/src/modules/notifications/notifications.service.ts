import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthUser } from '../../common/decorators/current-user.decorator';

export type NotifyPayload = {
  titleAr: string;
  bodyAr?: string;
  type: string;
  entityType?: string;
  entityId?: string;
};

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  list(user: AuthUser, unreadOnly = false) {
    return this.prisma.notification.findMany({
      where: {
        userId: user.id,
        ...(unreadOnly ? { isRead: false } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  unreadCount(user: AuthUser) {
    return this.prisma.notification.count({
      where: { userId: user.id, isRead: false },
    });
  }

  async markRead(user: AuthUser, id: string) {
    return this.prisma.notification.updateMany({
      where: { id, userId: user.id },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllRead(user: AuthUser) {
    return this.prisma.notification.updateMany({
      where: { userId: user.id, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async notifyUsers(userIds: string[], payload: NotifyPayload) {
    const unique = [...new Set(userIds.filter(Boolean))];
    if (!unique.length) return;
    await this.prisma.notification.createMany({
      data: unique.map((userId) => ({
        userId,
        titleAr: payload.titleAr,
        bodyAr: payload.bodyAr,
        type: payload.type,
        entityType: payload.entityType,
        entityId: payload.entityId,
      })),
    });
  }

  /** إدارة فقط — بدون تكرار إذا كان للمستخدم أكثر من دور إداري */
  async notifyAdmins(payload: NotifyPayload) {
    const users = await this.prisma.user.findMany({
      where: {
        status: 'ACTIVE',
        roles: { some: { role: { code: { in: ['super_admin', 'admin'] } } } },
      },
      select: { id: true },
    });
    await this.notifyUsers(
      users.map((u) => u.id),
      payload,
    );
  }

  async notifyRole(roleCode: string, payload: NotifyPayload) {
    const users = await this.prisma.user.findMany({
      where: { roles: { some: { role: { code: roleCode } } }, status: 'ACTIVE' },
      select: { id: true },
    });
    await this.notifyUsers(
      users.map((u) => u.id),
      payload,
    );
  }

  /** إدارة + مندوب المبيعات + موظفو الصفحة المرتبطة بالطلب */
  async notifyOrderStakeholders(
    order: {
      id: string;
      orderNumber: string;
      shippingName?: string | null;
      facebookPageId?: string | null;
      salesAgentId?: string | null;
      facebookPage?: { name?: string | null } | null;
    },
    payload: { titleAr: string; bodyAr?: string; type: string },
  ) {
    const userIds = new Set<string>();
    const admins = await this.prisma.user.findMany({
      where: {
        status: 'ACTIVE',
        roles: { some: { role: { code: { in: ['super_admin', 'admin'] } } } },
      },
      select: { id: true },
    });
    for (const u of admins) userIds.add(u.id);
    if (order.salesAgentId) userIds.add(order.salesAgentId);

    if (order.facebookPageId) {
      const page = await this.prisma.facebookPage.findUnique({
        where: { id: order.facebookPageId },
        select: {
          managerId: true,
          employees: { select: { userId: true } },
        },
      });
      if (page?.managerId) userIds.add(page.managerId);
      for (const e of page?.employees || []) userIds.add(e.userId);
    }

    const bodyAr =
      payload.bodyAr ||
      [`الطلب ${order.orderNumber}`, order.shippingName, order.facebookPage?.name]
        .filter(Boolean)
        .join(' — ');

    await this.notifyUsers([...userIds], {
      titleAr: payload.titleAr,
      bodyAr,
      type: payload.type,
      entityType: 'Order',
      entityId: order.id,
    });
  }
}
