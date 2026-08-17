import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CentralInventoryService } from '../inventory/services/central-inventory.service';
import { AuthUser } from '../../common/decorators/current-user.decorator';

@Injectable()
export class ReturnsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventory: CentralInventoryService,
  ) {}

  async lookupByBarcode(barcode: string) {
    const normalized = barcode.trim().toUpperCase();
    const order = await this.prisma.order.findFirst({
      where: {
        OR: [{ orderBarcode: normalized }, { orderNumber: normalized }],
      },
      include: {
        items: { include: { variant: { include: { product: true } } } },
        facebookPage: true,
        salesAgent: { select: { id: true, name: true } },
        warehouse: true,
      },
    });
    if (!order) throw new NotFoundException('الطلب غير موجود لهذا الباركود');

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      orderBarcode: order.orderBarcode,
      status: order.status,
      alreadyReturned: !!order.returnedToStockAt,
      returnedToStockAt: order.returnedToStockAt,
      page: order.facebookPage
        ? {
            name: order.facebookPage.name,
            pageCode: order.facebookPage.publicCode,
          }
        : null,
      agent: order.salesAgent,
      items: order.items.map((i) => ({
        id: i.id,
        variantId: i.variantId,
        productName: i.productName,
        variantName: i.variantName,
        color: i.variant?.color,
        size: i.variant?.size,
        sku: i.sku,
        quantity: i.quantity,
      })),
    };
  }

  async returnToStock(user: AuthUser, barcode: string, reason?: string) {
    const normalized = barcode.trim().toUpperCase();

    return this.inventory.withTransaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: {
          OR: [{ orderBarcode: normalized }, { orderNumber: normalized }],
        },
        include: { items: true },
      });
      if (!order) throw new NotFoundException('الطلب غير موجود لهذا الباركود');

      if (order.returnedToStockAt) {
        throw new BadRequestException('تم إرجاع هذا الطلب إلى المخزون مسبقًا.');
      }

      if (!order.stockDeductedAt) {
        throw new BadRequestException(
          'لم يتم خصم مخزون هذا الطلب مسبقاً، لا يمكن إرجاعه',
        );
      }

      const warehouseId =
        order.warehouseId || (await this.inventory.defaultWarehouseId(tx));

      for (const item of order.items) {
        if (!item.variantId) continue;
        await this.inventory.returnToStock({
          tx,
          warehouseId,
          variantId: item.variantId,
          quantity: item.quantity,
          actorId: user.id,
          orderId: order.id,
          reference: order.orderBarcode,
          reason: reason || 'failed_delivery_return',
          notes: `Return scan ${order.orderBarcode}`,
        });
      }

      const updated = await tx.order.update({
        where: { id: order.id },
        data: {
          returnedToStockAt: new Date(),
          status: 'RETURNED',
          localStatus: 'RETURNED',
        },
        include: { items: true },
      });

      await tx.delivery.updateMany({
        where: { orderId: order.id, status: { notIn: ['DELIVERED'] } },
        data: { status: 'RETURNED' },
      });

      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: 'inventory.return_to_stock',
          entityType: 'Order',
          entityId: order.id,
          meta: { barcode: order.orderBarcode, reason },
        },
      });

      return {
        message: 'تم إرجاع الطلب إلى المخزون المركزي',
        order: updated,
      };
    });
  }
}
