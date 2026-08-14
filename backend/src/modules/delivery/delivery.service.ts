import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DeliveryStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import {
  AssignDeliveryDto,
  CreateDeliveryCompanyDto,
  UpdateDeliveryStatusDto,
} from './dto/delivery.dto';

import { ROLE_CODES } from '../../common/permissions';
import {
  findDeliveryCity,
} from '../../common/delivery/delivery-zones';
import { StoreService } from '../store/store.service';
import { AccuratessService } from './accuratess.service';
import { CentralInventoryService } from '../inventory/services/central-inventory.service';

@Injectable()
export class DeliveryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storeService: StoreService,
    private readonly accuratess: AccuratessService,
    private readonly inventory: CentralInventoryService,
  ) {}

  quote(city?: string, area?: string) {
    return this.storeService.resolveDelivery(city, area);
  }

  async listAgents() {
    return this.prisma.user.findMany({
      where: {
        status: 'ACTIVE',
        roles: { some: { role: { code: ROLE_CODES.DELIVERY_AGENT } } },
      },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  listCompanies() {
    return this.prisma.deliveryCompany.findMany({
      where: { isActive: true },
      orderBy: { nameAr: 'asc' },
    });
  }

  createCompany(dto: CreateDeliveryCompanyDto) {
    return this.prisma.deliveryCompany.create({ data: dto });
  }

  listDeliveries(status?: string, type?: string) {
    return this.prisma.delivery.findMany({
      where: {
        ...(status ? { status: status as never } : {}),
        ...(type ? { type: type as never } : {}),
      },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            shippingName: true,
            shippingPhone: true,
            city: true,
            area: true,
            address: true,
            totalAmount: true,
            deliveryType: true,
            deliveryFee: true,
          },
        },
        agent: { select: { id: true, name: true, phone: true } },
        company: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  /** طلبات جاهزة للتعيين ولم يُنشأ لها سجل توصيل بعد */
  async listPendingOrders() {
    return this.prisma.order.findMany({
      where: {
        status: { in: ['NEW', 'CONFIRMED', 'PREPARING', 'READY'] },
        deliveries: { none: {} },
      },
      select: {
        id: true,
        orderNumber: true,
        shippingName: true,
        shippingPhone: true,
        city: true,
        area: true,
        address: true,
        deliveryType: true,
        deliveryFee: true,
        totalAmount: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  private async nextShippingSlip(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.delivery.count({
      where: { shippingSlipNo: { startsWith: `SLIP-${year}-` } },
    });
    return `SLIP-${year}-${String(count + 1).padStart(6, '0')}`;
  }

  async assign(user: AuthUser, dto: AssignDeliveryDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: { facebookPage: true },
    });
    if (!order) throw new NotFoundException('الطلب غير موجود');
    if (order.status === 'CANCELLED' || order.status === 'DELIVERED') {
      throw new BadRequestException('لا يمكن تعيين توصيل لهذا الطلب');
    }

    const zone = findDeliveryCity(order.city || undefined);
    const type = dto.type || (zone.mode === 'OWN_AGENTS' ? 'INTERNAL' : 'EXTERNAL');

    if (type === 'INTERNAL' && !dto.agentId) {
      throw new BadRequestException('يجب اختيار مندوب توصيل داخلي (مندوبوك المسجّلون)');
    }

    const shippingSlipNo = await this.nextShippingSlip();
    let status: DeliveryStatus = type === 'INTERNAL' ? 'ASSIGNED' : 'PENDING';
    let notes =
      dto.notes ||
      (type === 'EXTERNAL'
        ? 'طلب خارج طرابلس — Accuratess'
        : undefined);
    let trackingNumber: string | undefined;
    let trackingUrl: string | undefined;
    let externalRef: string | undefined;

    // خارج طرابلس: إرسال لشركة Accuratess مع مرجع الصفحة
    let accuratessResult: Record<string, unknown> | null = null;
    if (type === 'EXTERNAL') {
      const sourcePage =
        order.facebookPage?.name ||
        (order.pagePublicCode ? `صفحة #${order.pagePublicCode}` : 'بدون صفحة');
      const shipped = await this.accuratess.saveShipment({
        orderNumber: order.orderNumber,
        recipientName: order.shippingName || 'عميل',
        recipientPhone: order.shippingPhone || '',
        recipientAddress: order.address || order.area || order.city || 'ليبيا',
        city: order.city,
        area: order.area,
        notes: order.notes,
        price: Number(order.totalAmount || 0),
        deliveryFees: Number(dto.fee ?? order.deliveryFee ?? 0),
        sourcePage,
        sourcePageCode: order.pagePublicCode,
      });
      accuratessResult = shipped as Record<string, unknown>;

      const result = shipped as {
        ok?: boolean;
        skipped?: boolean;
        shipment?: { code?: string; trackingUrl?: string; id?: string };
        error?: string;
        reason?: string;
      };

      if (result.ok && result.shipment) {
        status = 'ASSIGNED';
        trackingNumber = String(result.shipment.code || result.shipment.id || '');
        externalRef = String(result.shipment.id || result.shipment.code || '');
        trackingUrl = result.shipment.trackingUrl
          ? String(result.shipment.trackingUrl)
          : undefined;
        notes = [
          notes,
          `Accuratess code=${result.shipment.code || ''}`,
          trackingUrl ? `track=${trackingUrl}` : '',
          `source_page=${sourcePage}`,
        ]
          .filter(Boolean)
          .join(' | ');
      } else if (result.skipped) {
        notes = `${notes || ''} | ${result.reason}`;
      } else if (result.error) {
        notes = `${notes || ''} | Accuratess error: ${result.error}`;
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const delivery = await tx.delivery.create({
        data: {
          orderId: dto.orderId,
          type,
          status,
          agentId: type === 'INTERNAL' ? dto.agentId : undefined,
          companyId: type === 'EXTERNAL' ? dto.companyId : undefined,
          fee: dto.fee ?? order.deliveryFee,
          notes,
          shippingSlipNo,
          trackingNumber,
          externalRef,
          trackingUrl,
          lastSyncedAt: trackingNumber ? new Date() : undefined,
          assignedAt: status === 'ASSIGNED' ? new Date() : undefined,
        },
        include: {
          order: { include: { facebookPage: true } },
          agent: { select: { id: true, name: true, phone: true } },
          company: true,
        },
      });

      await tx.order.update({
        where: { id: dto.orderId },
        data: {
          status:
            type === 'INTERNAL' || status === 'ASSIGNED'
              ? 'ASSIGNED'
              : order.status === 'NEW'
                ? 'CONFIRMED'
                : order.status,
          deliveryType: type,
          deliveryFee: dto.fee ?? order.deliveryFee,
          ...(order.status === 'NEW' && !order.stockDeductedAt
            ? { confirmedAt: new Date() }
            : {}),
        },
      });

      // خصم المخزون عند أول تقدم بعد الإنشاء
      if (!order.stockDeductedAt) {
        const full = await tx.order.findUnique({
          where: { id: dto.orderId },
          include: { items: true },
        });
        const warehouseId =
          full?.warehouseId || (await this.inventory.defaultWarehouseId(tx));
        for (const item of full?.items || []) {
          if (!item.variantId) continue;
          const variant = await tx.productVariant.findUnique({
            where: { id: item.variantId },
            include: { product: true },
          });
          if (!variant?.product.isTrackStock) continue;
          await this.inventory.sale({
            tx,
            warehouseId,
            variantId: item.variantId,
            quantity: item.quantity,
            actorId: user.id,
            orderId: dto.orderId,
            reference: full?.orderBarcode,
            reason: 'delivery_assign',
          });
        }
        await tx.order.update({
          where: { id: dto.orderId },
          data: { stockDeductedAt: new Date() },
        });
      }

      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: 'delivery.assign',
          entityType: 'Delivery',
          entityId: delivery.id,
          meta: {
            orderId: dto.orderId,
            type,
            shippingSlipNo,
            sourcePage: order.facebookPage?.name || order.pagePublicCode,
            accuratess: accuratessResult ?? null,
          } as Prisma.InputJsonValue,
        },
      });

      return { ...delivery, accuratess: accuratessResult };
    });
  }

  async updateStatus(user: AuthUser, id: string, dto: UpdateDeliveryStatusDto) {
    const delivery = await this.prisma.delivery.findUnique({ where: { id } });
    if (!delivery) throw new NotFoundException('سجل التوصيل غير موجود');

    const data: Record<string, unknown> = {
      status: dto.status,
      notes: dto.notes ?? delivery.notes,
      trackingNumber: dto.trackingNumber ?? delivery.trackingNumber,
    };

    if (dto.status === 'PICKED_UP') data.pickedUpAt = new Date();
    if (dto.status === 'DELIVERED') data.deliveredAt = new Date();

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.delivery.update({
        where: { id },
        data,
        include: {
          order: true,
          agent: { select: { id: true, name: true } },
          company: true,
        },
      });

      if (dto.status === 'IN_TRANSIT') {
        await tx.order.update({
          where: { id: delivery.orderId },
          data: { status: 'OUT_FOR_DELIVERY' },
        });
      }
      if (dto.status === 'DELIVERED') {
        await tx.order.update({
          where: { id: delivery.orderId },
          data: { status: 'DELIVERED', deliveredAt: new Date(), paymentStatus: 'PAID' },
        });
        const order = await tx.order.findUnique({ where: { id: delivery.orderId } });
        if (order?.customerId) {
          await tx.customer.update({
            where: { id: order.customerId },
            data: { deliveredOrders: { increment: 1 } },
          });
        }
      }
      if (dto.status === 'FAILED' || dto.status === 'RETURNED') {
        await tx.order.update({
          where: { id: delivery.orderId },
          data: { status: dto.status === 'RETURNED' ? 'RETURNED' : 'READY' },
        });
      }

      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: 'delivery.status_update',
          entityType: 'Delivery',
          entityId: id,
          meta: { from: delivery.status, to: dto.status },
        },
      });

      return updated;
    });
  }

  async getShippingSlip(id: string) {
    const delivery = await this.prisma.delivery.findUnique({
      where: { id },
      include: {
        order: {
          include: {
            items: true,
            customer: true,
            facebookPage: { select: { id: true, name: true, publicCode: true } },
          },
        },
        agent: { select: { id: true, name: true, phone: true } },
        company: true,
      },
    });
    if (!delivery) throw new NotFoundException('بوليصة الشحن غير موجودة');
    return {
      ...delivery,
      printTitle: 'بوليصة شحن — دار الأنوثة',
      sourcePage: delivery.order.facebookPage?.name || delivery.order.pagePublicCode,
    };
  }

  async getShippingSlipsBulk(ids: string[]) {
    if (!ids?.length) throw new BadRequestException('حدد بوليصات للطباعة');
    const slips = [];
    for (const id of ids) {
      slips.push(await this.getShippingSlip(id));
    }
    return { slips };
  }

  async syncAccuratess(user: AuthUser, id: string) {
    const delivery = await this.prisma.delivery.findUnique({ where: { id } });
    if (!delivery) throw new NotFoundException('سجل التوصيل غير موجود');
    if (delivery.type !== 'EXTERNAL') {
      throw new BadRequestException('المزامنة متاحة للشحن الخارجي فقط');
    }
    const code = delivery.trackingNumber || delivery.externalRef;
    if (!code) {
      throw new BadRequestException('لا يوجد رقم شحنة Accuratess');
    }

    const remote = await this.accuratess.getShipment(code);
    if ('skipped' in remote && remote.skipped) return remote;
    if (!remote.ok) return remote;

    const mapped = this.accuratess.mapRemoteStatus(remote.shipment?.status);
    await this.prisma.delivery.update({
      where: { id },
      data: {
        trackingUrl: remote.shipment?.trackingUrl || delivery.trackingUrl,
        lastSyncedAt: new Date(),
        notes: [
          delivery.notes,
          remote.shipment?.status ? `accuratess_status=${remote.shipment.status}` : '',
        ]
          .filter(Boolean)
          .join(' | '),
      },
    });

    if (mapped && mapped !== delivery.status) {
      return {
        remote,
        updated: await this.updateStatus(user, id, { status: mapped }),
      };
    }

    return { remote, updated: null, message: 'لا تغيير في الحالة' };
  }

  async syncAllAccuratess(user: AuthUser) {
    const open = await this.prisma.delivery.findMany({
      where: {
        type: 'EXTERNAL',
        status: { notIn: ['DELIVERED', 'RETURNED', 'FAILED'] },
        OR: [{ trackingNumber: { not: null } }, { externalRef: { not: null } }],
      },
      take: 50,
      orderBy: { updatedAt: 'asc' },
    });

    const results = [];
    for (const d of open) {
      try {
        results.push({ id: d.id, ...(await this.syncAccuratess(user, d.id)) });
      } catch (err) {
        results.push({
          id: d.id,
          ok: false,
          error: err instanceof Error ? err.message : 'sync error',
        });
      }
    }
    return { count: results.length, results };
  }
}
