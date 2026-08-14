import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { CreatePosReturnDto, CreatePosSaleDto } from './dto/pos.dto';
import { CentralInventoryService } from '../inventory/services/central-inventory.service';
import {
  canViewWholesalePrices,
  retailOf,
} from '../../common/pricing/price-policy';

@Injectable()
export class PosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventory: CentralInventoryService,
  ) {}

  private async nextOrderNumber(
    tx: Parameters<Parameters<CentralInventoryService['withTransaction']>[0]>[0],
  ): Promise<string> {
    const year = new Date().getFullYear();
    const seq = await tx.orderSequence.upsert({
      where: { year },
      create: { year, counter: 1 },
      update: { counter: { increment: 1 } },
    });
    return `ORD-${year}-${String(seq.counter).padStart(6, '0')}`;
  }

  private async nextInvoiceNumber(
    tx: Parameters<Parameters<CentralInventoryService['withTransaction']>[0]>[0],
    priceMode: 'RETAIL' | 'WHOLESALE',
  ): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = priceMode === 'WHOLESALE' ? `INV-W-${year}-` : `INV-R-${year}-`;
    const count = await tx.invoice.count({
      where: { invoiceNumber: { startsWith: prefix } },
    });
    return `${prefix}${String(count + 1).padStart(6, '0')}`;
  }

  async sell(user: AuthUser, dto: CreatePosSaleDto) {
    if (!dto.items?.length) {
      throw new BadRequestException('أضف منتجات للبيع');
    }

    const priceMode = dto.priceMode === 'WHOLESALE' ? 'WHOLESALE' : 'RETAIL';
    if (priceMode === 'WHOLESALE' && !canViewWholesalePrices(user)) {
      throw new ForbiddenException('بيع الجملة متاح للمالك فقط');
    }

    return this.inventory.withTransaction(async (tx) => {
      const warehouseId =
        dto.warehouseId || (await this.inventory.defaultWarehouseId(tx));

      let customerId = dto.customerId;
      if (!customerId && dto.customerPhone) {
        const existing = await tx.customer.findUnique({
          where: { phone: dto.customerPhone },
        });
        if (existing) {
          customerId = existing.id;
        } else {
          const created = await tx.customer.create({
            data: {
              name: dto.customerName || 'عميل نقطة البيع',
              phone: dto.customerPhone,
            },
          });
          customerId = created.id;
        }
      }

      const lineItems: Array<{
        variantId: string;
        productName: string;
        variantName: string | null;
        sku: string | null;
        quantity: number;
        unitPrice: number;
        discount: number;
        lineTotal: number;
      }> = [];

      for (const item of dto.items) {
        const variant = await tx.productVariant.findUnique({
          where: { id: item.variantId },
          include: { product: true },
        });
        if (!variant || !variant.isActive) {
          throw new NotFoundException(`الصنف غير موجود: ${item.variantId}`);
        }

        const retail = retailOf(variant);
        const wholesale = Number(variant.wholesalePrice ?? retail);
        const resolved =
          priceMode === 'WHOLESALE'
            ? wholesale > 0
              ? wholesale
              : retail
            : retail;
        // العميل قد يرسل سعراً يدوياً في القطاعي فقط؛ الجملة تُثبت من النظام
        const unitPrice =
          priceMode === 'WHOLESALE'
            ? resolved
            : Number(item.unitPrice ?? resolved);
        const discount = item.discount ?? 0;
        const lineTotal = item.quantity * unitPrice - discount;

        lineItems.push({
          variantId: variant.id,
          productName: variant.product.nameAr,
          variantName:
            variant.nameAr ||
            [variant.color, variant.size].filter(Boolean).join(' / ') ||
            null,
          sku: variant.sku,
          quantity: item.quantity,
          unitPrice,
          discount,
          lineTotal,
        });

        if (variant.product.isTrackStock) {
          await this.inventory.sale({
            tx,
            warehouseId,
            variantId: variant.id,
            quantity: item.quantity,
            actorId: user.id,
            reference: 'POS',
            reason: 'pos_sale',
          });
        }
      }

      const subtotal = lineItems.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
      const lineDiscounts = lineItems.reduce((s, i) => s + i.discount, 0);
      const discountAmount = (dto.discountAmount ?? 0) + lineDiscounts;
      const totalAmount = Math.max(0, subtotal - discountAmount);
      const orderNumber = await this.nextOrderNumber(tx);
      const modeLabel = priceMode === 'WHOLESALE' ? 'جملة' : 'قطاعي';

      const order = await tx.order.create({
        data: {
          orderNumber,
          orderBarcode: orderNumber,
          source: priceMode === 'WHOLESALE' ? 'WHOLESALE' : 'POS',
          status: 'DELIVERED',
          paymentMethod: dto.paymentMethod ?? 'CASH',
          paymentStatus: 'PAID',
          deliveryType: 'STORE',
          customerId,
          cashierId: user.id,
          warehouseId,
          attributionSource: `POS_${priceMode}`,
          subtotal,
          discountAmount,
          deliveryFee: 0,
          totalAmount,
          currency: 'LYD',
          shippingName: dto.customerName,
          shippingPhone: dto.customerPhone,
          notes: [dto.notes, `فاتورة ${modeLabel}`].filter(Boolean).join(' | '),
          confirmedAt: new Date(),
          deliveredAt: new Date(),
          stockDeductedAt: new Date(),
          items: {
            create: lineItems.map((l) => ({
              variantId: l.variantId,
              productName: l.productName,
              variantName: l.variantName,
              sku: l.sku,
              quantity: l.quantity,
              unitPrice: l.unitPrice,
              discount: l.discount,
              lineTotal: l.lineTotal,
            })),
          },
        },
      });

      const invoiceNumber = await this.nextInvoiceNumber(tx, priceMode);
      await tx.invoice.create({
        data: {
          invoiceNumber,
          orderId: order.id,
          amount: totalAmount,
          currency: 'LYD',
          notes: `POS ${priceMode} — ${modeLabel}`,
        },
      });

      if (customerId) {
        await tx.customer.update({
          where: { id: customerId },
          data: {
            totalOrders: { increment: 1 },
            deliveredOrders: { increment: 1 },
            totalPurchases: { increment: totalAmount },
            lastOrderAt: new Date(),
          },
        });
      }

      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: 'pos.sell',
          entityType: 'Order',
          entityId: order.id,
          meta: { orderNumber, totalAmount, priceMode },
        },
      });

      return this.getInvoice(order.id);
    });
  }

  async getInvoice(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        customer: true,
        invoice: true,
        cashier: { select: { id: true, name: true } },
      },
    });
    if (!order || (order.source !== 'POS' && order.source !== 'WHOLESALE')) {
      throw new NotFoundException('فاتورة نقطة البيع غير موجودة');
    }

    const priceMode =
      order.attributionSource === 'POS_WHOLESALE' || order.source === 'WHOLESALE'
        ? 'WHOLESALE'
        : 'RETAIL';

    return {
      ...order,
      priceMode,
      priceModeLabel: priceMode === 'WHOLESALE' ? 'جملة' : 'قطاعي',
      company: {
        name: 'دار الأنوثة',
        city: 'طرابلس — ليبيا',
        phones: ['0911820999', '0924443839'],
      },
    };
  }

  async returnSale(user: AuthUser, dto: CreatePosReturnDto) {
    return this.inventory.withTransaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: dto.orderId },
        include: { items: true },
      });
      if (
        !order ||
        (order.source !== 'POS' && order.source !== 'WHOLESALE')
      ) {
        throw new NotFoundException('فاتورة نقطة البيع غير موجودة');
      }
      if (order.returnedToStockAt) {
        throw new BadRequestException('تم إرجاع هذا الطلب إلى المخزون مسبقًا.');
      }
      if (!order.warehouseId) {
        throw new BadRequestException('الطلب بدون مخزن');
      }

      for (const item of dto.items) {
        const line = order.items.find((i) => i.variantId === item.variantId);
        if (!line) {
          throw new BadRequestException('الصنف غير موجود في الفاتورة');
        }
        if (item.quantity > line.quantity) {
          throw new BadRequestException('كمية المرتجع أكبر من الكمية المباعة');
        }

        await this.inventory.returnToStock({
          tx,
          warehouseId: order.warehouseId,
          variantId: item.variantId,
          quantity: item.quantity,
          actorId: user.id,
          orderId: order.id,
          reference: order.orderBarcode,
          reason: dto.notes || 'pos_return',
        });
      }

      const updated = await tx.order.update({
        where: { id: order.id },
        data: {
          status: 'RETURNED',
          paymentStatus: 'REFUNDED',
          returnedToStockAt: new Date(),
        },
        include: { items: true, invoice: true },
      });

      if (order.customerId) {
        await tx.customer.update({
          where: { id: order.customerId },
          data: { returnsCount: { increment: 1 } },
        });
      }

      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: 'pos.return',
          entityType: 'Order',
          entityId: order.id,
          meta: { notes: dto.notes },
        },
      });

      return updated;
    });
  }
}
