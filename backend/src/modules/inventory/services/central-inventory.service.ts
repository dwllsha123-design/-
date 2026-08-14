import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InventoryMovementType, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

export type InventoryActor = { id: string };

type Tx = Prisma.TransactionClient;

export type StockMutationInput = {
  warehouseId: string;
  variantId: string;
  quantity: number;
  actorId?: string;
  orderId?: string;
  reference?: string;
  reason?: string;
  notes?: string;
};

@Injectable()
export class CentralInventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async withTransaction<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(async (tx) => fn(tx), {
      // SQLite serializes writes; keep timeout generous for concurrent reserves
      maxWait: 5000,
      timeout: 15000,
    });
  }

  async getOrCreateStock(tx: Tx, warehouseId: string, variantId: string) {
    const existing = await tx.stockItem.findUnique({
      where: { warehouseId_variantId: { warehouseId, variantId } },
    });
    if (existing) return existing;
    return tx.stockItem.create({
      data: { warehouseId, variantId, quantityOnHand: 0, quantityReserved: 0 },
    });
  }

  availableQty(onHand: number, reserved: number) {
    return Math.max(0, onHand - reserved);
  }

  async getAvailability(variantId: string, warehouseId?: string) {
    const items = await this.prisma.stockItem.findMany({
      where: { variantId, ...(warehouseId ? { warehouseId } : {}) },
    });
    const available = items.reduce(
      (sum, i) => sum + this.availableQty(i.quantityOnHand, i.quantityReserved),
      0,
    );
    return { variantId, warehouseId, available, items };
  }

  private async writeMovement(
    tx: Tx,
    type: InventoryMovementType,
    input: StockMutationInput,
  ) {
    await tx.inventoryMovement.create({
      data: {
        warehouseId: input.warehouseId,
        variantId: input.variantId,
        type,
        quantity: Math.abs(input.quantity),
        orderId: input.orderId,
        reference: input.reference,
        reason: input.reason,
        notes: input.notes,
        createdById: input.actorId,
      },
    });
  }

  /** Atomic reserve: Available decreases, Reserved increases */
  async reserve(input: StockMutationInput & { tx?: Tx }) {
    const run = async (tx: Tx) => {
      if (input.quantity <= 0) {
        throw new BadRequestException('كمية الحجز يجب أن تكون أكبر من صفر');
      }
      const stock = await this.getOrCreateStock(tx, input.warehouseId, input.variantId);
      const available = this.availableQty(stock.quantityOnHand, stock.quantityReserved);
      if (available < input.quantity) {
        throw new BadRequestException(
          `الكمية المتاحة غير كافية (المتاح: ${available})`,
        );
      }
      const updated = await tx.stockItem.update({
        where: { id: stock.id },
        data: { quantityReserved: { increment: input.quantity } },
      });
      await this.writeMovement(tx, 'RESERVE', input);
      return updated;
    };
    return input.tx ? run(input.tx) : this.withTransaction(run);
  }

  async releaseReservation(input: StockMutationInput & { tx?: Tx }) {
    const run = async (tx: Tx) => {
      if (input.quantity <= 0) {
        throw new BadRequestException('كمية تحرير الحجز غير صالحة');
      }
      const stock = await this.getOrCreateStock(tx, input.warehouseId, input.variantId);
      const releaseQty = Math.min(input.quantity, stock.quantityReserved);
      const updated = await tx.stockItem.update({
        where: { id: stock.id },
        data: { quantityReserved: { decrement: releaseQty } },
      });
      await this.writeMovement(tx, 'RELEASE', { ...input, quantity: releaseQty });
      return updated;
    };
    return input.tx ? run(input.tx) : this.withTransaction(run);
  }

  /** Sale: decrease on-hand (and reserved if consuming reservation) */
  async sale(
    input: StockMutationInput & {
      tx?: Tx;
      consumeReserved?: number;
    },
  ) {
    const run = async (tx: Tx) => {
      if (input.quantity <= 0) {
        throw new BadRequestException('كمية البيع غير صالحة');
      }
      const stock = await this.getOrCreateStock(tx, input.warehouseId, input.variantId);
      const consumeReserved = Math.min(
        input.consumeReserved ?? 0,
        stock.quantityReserved,
        input.quantity,
      );
      const available = this.availableQty(stock.quantityOnHand, stock.quantityReserved);
      const neededFromAvailable = input.quantity - consumeReserved;
      if (neededFromAvailable > available) {
        throw new BadRequestException('المخزون غير كافٍ لإتمام البيع');
      }
      if (stock.quantityOnHand < input.quantity) {
        throw new BadRequestException('المخزون غير كافٍ');
      }
      const updated = await tx.stockItem.update({
        where: { id: stock.id },
        data: {
          quantityOnHand: { decrement: input.quantity },
          quantityReserved:
            consumeReserved > 0 ? { decrement: consumeReserved } : undefined,
        },
      });
      await this.writeMovement(tx, 'SALE', input);
      return updated;
    };
    return input.tx ? run(input.tx) : this.withTransaction(run);
  }

  async returnToStock(input: StockMutationInput & { tx?: Tx }) {
    const run = async (tx: Tx) => {
      if (input.quantity <= 0) {
        throw new BadRequestException('كمية الإرجاع غير صالحة');
      }
      const stock = await this.getOrCreateStock(tx, input.warehouseId, input.variantId);
      const updated = await tx.stockItem.update({
        where: { id: stock.id },
        data: { quantityOnHand: { increment: input.quantity } },
      });
      await this.writeMovement(tx, 'RETURN', input);
      return updated;
    };
    return input.tx ? run(input.tx) : this.withTransaction(run);
  }

  async adjust(input: StockMutationInput & { tx?: Tx; absolute?: boolean }) {
    const run = async (tx: Tx) => {
      const stock = await this.getOrCreateStock(tx, input.warehouseId, input.variantId);
      const next = input.absolute
        ? input.quantity
        : stock.quantityOnHand + input.quantity;
      if (next < 0) throw new BadRequestException('الرصيد لا يمكن أن يكون سالباً');
      if (next < stock.quantityReserved) {
        throw new BadRequestException('لا يمكن أن يقل المخزون عن الكمية المحجوزة');
      }
      const updated = await tx.stockItem.update({
        where: { id: stock.id },
        data: { quantityOnHand: next },
      });
      await this.writeMovement(tx, 'ADJUST', {
        ...input,
        quantity: Math.abs(next - stock.quantityOnHand) || Math.abs(input.quantity),
      });
      return updated;
    };
    return input.tx ? run(input.tx) : this.withTransaction(run);
  }

  async damage(input: StockMutationInput & { tx?: Tx }) {
    const run = async (tx: Tx) => {
      if (input.quantity <= 0) throw new BadRequestException('كمية التالف غير صالحة');
      const stock = await this.getOrCreateStock(tx, input.warehouseId, input.variantId);
      const available = this.availableQty(stock.quantityOnHand, stock.quantityReserved);
      if (available < input.quantity) {
        throw new BadRequestException('لا توجد كمية كافية لتسجيل التالف');
      }
      const updated = await tx.stockItem.update({
        where: { id: stock.id },
        data: { quantityOnHand: { decrement: input.quantity } },
      });
      await this.writeMovement(tx, 'DAMAGE', input);
      return updated;
    };
    return input.tx ? run(input.tx) : this.withTransaction(run);
  }

  async receiveIn(input: StockMutationInput & { tx?: Tx }) {
    const run = async (tx: Tx) => {
      if (input.quantity <= 0) throw new BadRequestException('كمية الإدخال غير صالحة');
      const stock = await this.getOrCreateStock(tx, input.warehouseId, input.variantId);
      const updated = await tx.stockItem.update({
        where: { id: stock.id },
        data: { quantityOnHand: { increment: input.quantity } },
      });
      await this.writeMovement(tx, 'IN', input);
      return updated;
    };
    return input.tx ? run(input.tx) : this.withTransaction(run);
  }

  async assertAvailableOrThrow(variantId: string, quantity: number, warehouseId?: string) {
    const { available } = await this.getAvailability(variantId, warehouseId);
    if (available < quantity) {
      throw new BadRequestException(
        available <= 0 ? 'غير متوفر' : `المتوفر ${available} فقط`,
      );
    }
    return available;
  }

  async defaultWarehouseId(tx?: Tx) {
    const db = tx ?? this.prisma;
    const wh =
      (await db.warehouse.findFirst({ where: { isDefault: true, isActive: true } })) ||
      (await db.warehouse.findFirst({ where: { isActive: true } }));
    if (!wh) throw new NotFoundException('لا يوجد مخزن نشط');
    return wh.id;
  }
}
