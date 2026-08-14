import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthUser } from '../../common/decorators/current-user.decorator';

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

  async notifyUsers(
    userIds: string[],
    payload: {
      titleAr: string;
      bodyAr?: string;
      type: string;
      entityType?: string;
      entityId?: string;
    },
  ) {
    if (!userIds.length) return;
    await this.prisma.notification.createMany({
      data: userIds.map((userId) => ({
        userId,
        titleAr: payload.titleAr,
        bodyAr: payload.bodyAr,
        type: payload.type,
        entityType: payload.entityType,
        entityId: payload.entityId,
      })),
    });
  }

  async notifyRole(roleCode: string, payload: {
    titleAr: string;
    bodyAr?: string;
    type: string;
    entityType?: string;
    entityId?: string;
  }) {
    const users = await this.prisma.user.findMany({
      where: { roles: { some: { role: { code: roleCode } } }, status: 'ACTIVE' },
      select: { id: true },
    });
    await this.notifyUsers(
      users.map((u) => u.id),
      payload,
    );
  }
}
