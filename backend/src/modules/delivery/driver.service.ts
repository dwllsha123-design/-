import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LocalOrderStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { ReturnsService } from '../returns/returns.service';
import { OrderFulfillmentService } from './order-fulfillment.service';

@Injectable()
export class DriverService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly returns: ReturnsService,
    private readonly fulfillment: OrderFulfillmentService,
  ) {}

  async requireCourier(userId: string) {
    const courier = await this.prisma.courier.findUnique({
      where: { userId },
    });
    if (!courier || !courier.isActive) {
      throw new ForbiddenException('هذا الحساب غير مرتبط بمندوب توصيل نشط في طرابلس');
    }
    return courier;
  }

  async me(user: AuthUser) {
    const courier = await this.requireCourier(user.id);
    const activeOrders = await this.prisma.order.count({
      where: {
        courierId: courier.id,
        status: { in: ['ASSIGNED', 'OUT_FOR_DELIVERY', 'READY'] },
      },
    });
    return {
      user: { id: user.id, name: user.name, phone: user.phone },
      courier,
      stats: { activeOrders },
    };
  }

  async myOrders(user: AuthUser) {
    const courier = await this.requireCourier(user.id);
    const orders = await this.prisma.order.findMany({
      where: { courierId: courier.id, status: { notIn: ['CANCELLED'] } },
      include: {
        items: true,
        customer: { select: { name: true, phone: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 80,
    });
    return {
      new: orders.filter((o) => o.localStatus === 'IN_WAREHOUSE' || o.status === 'ASSIGNED'),
      onTheWay: orders.filter(
        (o) => o.localStatus === 'OUT_FOR_DELIVERY' || o.status === 'OUT_FOR_DELIVERY',
      ),
      delivered: orders.filter((o) => o.status === 'DELIVERED'),
      returns: orders.filter(
        (o) => o.localStatus === 'FAILED' || o.status === 'RETURNED' || o.localStatus === 'RETURNED',
      ),
      all: orders,
    };
  }

  async pingLocation(user: AuthUser, lat: number, lng: number) {
    const courier = await this.requireCourier(user.id);
    return this.prisma.courier.update({
      where: { id: courier.id },
      data: { lastLat: lat, lastLng: lng, lastSeenAt: new Date() },
    });
  }

  async heartbeat(user: AuthUser) {
    const courier = await this.requireCourier(user.id);
    return this.prisma.courier.update({
      where: { id: courier.id },
      data: { lastSeenAt: new Date() },
    });
  }

  async updateOrderStatus(user: AuthUser, orderId: string, localStatus: LocalOrderStatus) {
    const courier = await this.requireCourier(user.id);
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order || order.courierId !== courier.id) {
      throw new NotFoundException('الطلب غير مسند إليك');
    }
    await this.prisma.courier.update({
      where: { id: courier.id },
      data: { lastSeenAt: new Date() },
    });
    return this.fulfillment.updateLocalStatus(orderId, localStatus);
  }

  async lookupBarcode(barcode: string) {
    return this.returns.lookupByBarcode(barcode);
  }

  async returnByBarcode(user: AuthUser, barcode: string) {
    const courier = await this.requireCourier(user.id);
    const lookup = await this.returns.lookupByBarcode(barcode);
    const order = await this.prisma.order.findUnique({
      where: { id: lookup.id },
      select: { courierId: true },
    });
    if (order?.courierId && order.courierId !== courier.id) {
      throw new ForbiddenException('هذا الطلب مسند لمندوب آخر');
    }
    return this.returns.returnToStock(user, barcode, 'failed_delivery_return');
  }
}
