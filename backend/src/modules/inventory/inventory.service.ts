import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { AdjustStockDto, CreateWarehouseDto } from './dto/inventory.dto';
import { CentralInventoryService } from './services/central-inventory.service';

@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly central: CentralInventoryService,
  ) {}

  listWarehouses() {
    return this.prisma.warehouse.findMany({ orderBy: { nameAr: 'asc' } });
  }

  createWarehouse(dto: CreateWarehouseDto) {
    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        await tx.warehouse.updateMany({ data: { isDefault: false } });
      }
      return tx.warehouse.create({ data: dto });
    });
  }

  listStock(warehouseId?: string) {
    return this.prisma.stockItem.findMany({
      where: warehouseId ? { warehouseId } : undefined,
      include: {
        warehouse: true,
        variant: { include: { product: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 200,
    }).then((rows) =>
      rows.map((s) => ({
        ...s,
        available: s.quantityOnHand - s.quantityReserved,
      })),
    );
  }

  async adjust(user: AuthUser, dto: AdjustStockDto) {
    if (dto.quantity === 0) {
      throw new BadRequestException('الكمية لا يمكن أن تكون صفر');
    }

    switch (dto.type) {
      case 'IN':
        return this.central.receiveIn({
          warehouseId: dto.warehouseId,
          variantId: dto.variantId,
          quantity: Math.abs(dto.quantity),
          actorId: user.id,
          notes: dto.notes,
          reference: dto.reference,
          reason: 'manual_in',
        });
      case 'OUT':
        return this.central.sale({
          warehouseId: dto.warehouseId,
          variantId: dto.variantId,
          quantity: Math.abs(dto.quantity),
          actorId: user.id,
          notes: dto.notes,
          reference: dto.reference,
          reason: 'manual_out',
        });
      case 'ADJUST':
        return this.central.adjust({
          warehouseId: dto.warehouseId,
          variantId: dto.variantId,
          quantity: dto.quantity,
          absolute: true,
          actorId: user.id,
          notes: dto.notes,
          reference: dto.reference,
          reason: 'manual_adjust',
        });
      case 'RESERVE':
        return this.central.reserve({
          warehouseId: dto.warehouseId,
          variantId: dto.variantId,
          quantity: Math.abs(dto.quantity),
          actorId: user.id,
          notes: dto.notes,
          reference: dto.reference,
          reason: 'manual_reserve',
        });
      case 'RELEASE':
        return this.central.releaseReservation({
          warehouseId: dto.warehouseId,
          variantId: dto.variantId,
          quantity: Math.abs(dto.quantity),
          actorId: user.id,
          notes: dto.notes,
          reference: dto.reference,
          reason: 'manual_release',
        });
      case 'RETURN':
        return this.central.returnToStock({
          warehouseId: dto.warehouseId,
          variantId: dto.variantId,
          quantity: Math.abs(dto.quantity),
          actorId: user.id,
          notes: dto.notes,
          reference: dto.reference,
          reason: 'manual_return',
        });
      case 'DAMAGE':
        return this.central.damage({
          warehouseId: dto.warehouseId,
          variantId: dto.variantId,
          quantity: Math.abs(dto.quantity),
          actorId: user.id,
          notes: dto.notes,
          reference: dto.reference,
          reason: 'damage',
        });
      case 'TRANSFER':
        throw new BadRequestException('التحويل بين المخازن سيُضاف لاحقاً عبر مسار مخصص');
      case 'SALE':
        return this.central.sale({
          warehouseId: dto.warehouseId,
          variantId: dto.variantId,
          quantity: Math.abs(dto.quantity),
          actorId: user.id,
          notes: dto.notes,
          reference: dto.reference,
          reason: 'manual_sale',
        });
      default:
        throw new BadRequestException('نوع حركة غير مدعوم');
    }
  }

  async getAvailable(variantId: string, warehouseId?: string) {
    return this.central.getAvailability(variantId, warehouseId);
  }

  listMovements(limit = 100) {
    return this.prisma.inventoryMovement.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        warehouse: true,
        createdBy: { select: { id: true, name: true } },
      },
    });
  }

  async alerts() {
    const rows = await this.prisma.stockItem.findMany({
      include: {
        warehouse: true,
        variant: { include: { product: true } },
      },
      orderBy: { quantityOnHand: 'asc' },
      take: 300,
    });
    return rows
      .filter((s) => s.quantityOnHand <= s.reorderLevel)
      .map((s) => ({
        ...s,
        available: s.quantityOnHand - s.quantityReserved,
        level: s.quantityOnHand <= 0 ? 'OUT' : 'LOW',
      }));
  }
}
