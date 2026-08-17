import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { ROLE_CODES } from '../../common/permissions';

export type UpsertCourierDto = {
  name: string;
  phone?: string;
  isActive?: boolean;
  notes?: string;
  userId?: string;
  password?: string;
};

@Injectable()
export class CouriersService {
  constructor(private readonly prisma: PrismaService) {}

  list(activeOnly = false) {
    return this.prisma.courier.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      include: {
        user: { select: { id: true, phone: true, status: true } },
        _count: {
          select: {
            orders: {
              where: {
                status: { in: ['ASSIGNED', 'OUT_FOR_DELIVERY', 'READY'] },
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async dashboard() {
    const [couriers, pending, out, deliveredToday] = await Promise.all([
      this.list(false),
      this.prisma.order.count({
        where: {
          fulfillmentType: 'INTERNAL',
          courierId: null,
          status: { in: ['NEW', 'CONFIRMED', 'PREPARING', 'READY'] },
        },
      }),
      this.prisma.order.count({
        where: {
          fulfillmentType: 'INTERNAL',
          status: { in: ['ASSIGNED', 'OUT_FOR_DELIVERY'] },
        },
      }),
      this.prisma.order.count({
        where: {
          fulfillmentType: 'INTERNAL',
          status: 'DELIVERED',
          deliveredAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
    ]);

    const withOrders = await Promise.all(
      couriers.map(async (c) => {
        const current = await this.prisma.order.findMany({
          where: {
            courierId: c.id,
            status: { in: ['ASSIGNED', 'OUT_FOR_DELIVERY', 'READY'] },
          },
          select: {
            id: true,
            orderNumber: true,
            shippingName: true,
            shippingPhone: true,
            area: true,
            address: true,
            localStatus: true,
            status: true,
            totalAmount: true,
          },
          take: 8,
          orderBy: { updatedAt: 'desc' },
        });
        const online =
          c.isActive &&
          c.lastSeenAt &&
          Date.now() - new Date(c.lastSeenAt).getTime() < 5 * 60 * 1000;
        return {
          ...c,
          currentOrders: current,
          currentCount: c._count.orders,
          online: Boolean(online),
        };
      }),
    );

    return {
      city: 'طرابلس',
      stats: {
        drivers: couriers.filter((c) => c.isActive).length,
        pendingUnassigned: pending,
        outForDelivery: out,
        deliveredToday,
      },
      drivers: withOrders,
    };
  }

  async create(dto: UpsertCourierDto) {
    if (dto.password && !dto.phone) {
      throw new BadRequestException('رقم الهاتف مطلوب لإنشاء حساب دخول للمندوب');
    }

    let userId = dto.userId;
    if (dto.password && dto.phone) {
      userId = await this.ensureDriverUser({
        name: dto.name,
        phone: dto.phone,
        password: dto.password,
      });
    }

    return this.prisma.courier.create({
      data: {
        name: dto.name,
        phone: dto.phone,
        isActive: dto.isActive ?? true,
        notes: dto.notes,
        city: 'طرابلس',
        userId,
      },
      include: { user: { select: { id: true, phone: true, status: true } } },
    });
  }

  async update(id: string, dto: Partial<UpsertCourierDto>) {
    const row = await this.ensure(id);
    let userId = dto.userId ?? row.userId;

    if (dto.password) {
      const phone = dto.phone || row.phone;
      if (!phone) {
        throw new BadRequestException('رقم الهاتف مطلوب لتعيين كلمة السر');
      }
      userId = await this.ensureDriverUser({
        name: dto.name || row.name,
        phone,
        password: dto.password,
        existingUserId: row.userId,
      });
    } else if (dto.phone && row.userId) {
      await this.prisma.user.update({
        where: { id: row.userId },
        data: { phone: dto.phone, name: dto.name || row.name },
      });
    }

    return this.prisma.courier.update({
      where: { id },
      data: {
        name: dto.name,
        phone: dto.phone,
        isActive: dto.isActive,
        notes: dto.notes,
        userId,
        city: 'طرابلس',
      },
      include: { user: { select: { id: true, phone: true, status: true } } },
    });
  }

  async remove(id: string) {
    await this.ensure(id);
    return this.prisma.courier.update({
      where: { id },
      data: { isActive: false },
    });
  }

  private async ensure(id: string) {
    const row = await this.prisma.courier.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('المندوب غير موجود');
    return row;
  }

  private async ensureDriverUser(input: {
    name: string;
    phone: string;
    password: string;
    existingUserId?: string | null;
  }) {
    const role = await this.prisma.role.findUnique({
      where: { code: ROLE_CODES.DELIVERY_AGENT },
    });
    if (!role) throw new BadRequestException('دور مندوب التوصيل غير مهيأ');

    const passwordHash = await bcrypt.hash(input.password, 10);

    if (input.existingUserId) {
      await this.prisma.user.update({
        where: { id: input.existingUserId },
        data: {
          name: input.name,
          phone: input.phone,
          passwordHash,
          status: 'ACTIVE',
        },
      });
      return input.existingUserId;
    }

    const existing = await this.prisma.user.findFirst({
      where: { phone: input.phone },
    });
    if (existing) {
      await this.prisma.user.update({
        where: { id: existing.id },
        data: { passwordHash, name: input.name, status: 'ACTIVE' },
      });
      const hasRole = await this.prisma.userRole.findUnique({
        where: { userId_roleId: { userId: existing.id, roleId: role.id } },
      });
      if (!hasRole) {
        await this.prisma.userRole.create({
          data: { userId: existing.id, roleId: role.id },
        });
      }
      return existing.id;
    }

    const user = await this.prisma.user.create({
      data: {
        name: input.name,
        phone: input.phone,
        passwordHash,
        locale: 'ar',
        status: 'ACTIVE',
        roles: { create: [{ roleId: role.id }] },
      },
    });
    return user.id;
  }
}
