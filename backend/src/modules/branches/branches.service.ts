import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { BranchType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { ROLE_CODES } from '../../common/permissions';
import { CentralInventoryService } from '../inventory/services/central-inventory.service';
import {
  CreateBranchDto,
  CreateTransferDto,
  UpdateBranchDto,
} from './dto/branch.dto';

@Injectable()
export class BranchesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventory: CentralInventoryService,
  ) {}

  list() {
    return this.prisma.branch.findMany({
      orderBy: [{ isMain: 'desc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        name: true,
        username: true,
        type: true,
        isMain: true,
        isActive: true,
        warehouseId: true,
        createdAt: true,
        warehouse: { select: { id: true, code: true, nameAr: true } },
        _count: { select: { orders: true } },
      },
    });
  }

  async get(id: string) {
    const branch = await this.prisma.branch.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        username: true,
        type: true,
        isMain: true,
        isActive: true,
        warehouseId: true,
        createdAt: true,
        warehouse: true,
        stockItems: {
          where: { quantityOnHand: { gt: 0 } },
          include: {
            variant: { include: { product: { select: { nameAr: true } } } },
          },
          take: 300,
        },
      },
    });
    if (!branch) throw new NotFoundException('الفرع غير موجود');
    return branch;
  }

  async create(dto: CreateBranchDto) {
    const username = dto.username.trim().toLowerCase();
    if (!/^[a-z0-9._-]{3,32}$/.test(username)) {
      throw new BadRequestException(
        'اسم المستخدم بالإنجليزية فقط (حروف وأرقام و . _ -)',
      );
    }
    const exists = await this.prisma.branch.findUnique({ where: { username } });
    if (exists) throw new ConflictException('اسم المستخدم مستخدم لفرع آخر');

    const type = dto.type as BranchType;
    if (type === 'WHOLESALE_RETAIL') {
      const main = await this.prisma.branch.findFirst({ where: { isMain: true } });
      if (main) {
        throw new BadRequestException(
          'فرع الجملة والقطاعي موجود مسبقاً (الفرع الرئيسي)',
        );
      }
    }

    const cashierRole = await this.prisma.role.findUnique({
      where: { code: ROLE_CODES.BRANCH_CASHIER },
    });
    const fallbackRole = cashierRole
      ? cashierRole
      : await this.prisma.role.findUniqueOrThrow({
          where: { code: ROLE_CODES.CASHIER },
        });

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const email = `${username}@branch.local`;

    return this.prisma.$transaction(async (tx) => {
      const warehouse = await tx.warehouse.create({
        data: {
          code: `BR-${username.toUpperCase()}`,
          nameAr: dto.name.trim(),
          nameEn: username,
          isDefault: false,
          isActive: true,
        },
      });
      const user = await tx.user.create({
        data: {
          name: dto.name.trim(),
          email,
          passwordHash,
          locale: 'ar',
          roles: { create: [{ roleId: fallbackRole.id }] },
        },
      });
      return tx.branch.create({
        data: {
          name: dto.name.trim(),
          username,
          passwordHash,
          type,
          isMain: type === 'WHOLESALE_RETAIL',
          warehouseId: warehouse.id,
          userId: user.id,
        },
        select: {
          id: true,
          name: true,
          username: true,
          type: true,
          isMain: true,
          isActive: true,
          warehouseId: true,
          warehouse: true,
        },
      });
    });
  }

  async update(id: string, dto: UpdateBranchDto) {
    const branch = await this.prisma.branch.findUnique({ where: { id } });
    if (!branch) throw new NotFoundException('الفرع غير موجود');

    const data: {
      name?: string;
      type?: BranchType;
      isActive?: boolean;
      passwordHash?: string;
    } = {};
    if (dto.name) data.name = dto.name.trim();
    if (dto.type) {
      if (branch.isMain && dto.type !== 'WHOLESALE_RETAIL') {
        throw new BadRequestException('الفرع الرئيسي يبقى جملة وقطاعي');
      }
      data.type = dto.type;
    }
    if (typeof dto.isActive === 'boolean') {
      if (branch.isMain && !dto.isActive) {
        throw new BadRequestException('لا يمكن تعطيل الفرع الرئيسي');
      }
      data.isActive = dto.isActive;
    }
    if (dto.password) {
      data.passwordHash = await bcrypt.hash(dto.password, 10);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const next = await tx.branch.update({
        where: { id },
        data,
        select: {
          id: true,
          name: true,
          username: true,
          type: true,
          isMain: true,
          isActive: true,
          warehouseId: true,
        },
      });
      if (data.passwordHash) {
        await tx.user.update({
          where: { id: branch.userId },
          data: { passwordHash: data.passwordHash, status: next.isActive ? 'ACTIVE' : 'INACTIVE' },
        });
      } else if (typeof dto.isActive === 'boolean') {
        await tx.user.update({
          where: { id: branch.userId },
          data: { status: dto.isActive ? 'ACTIVE' : 'INACTIVE' },
        });
      }
      if (data.name) {
        await tx.warehouse.update({
          where: { id: branch.warehouseId },
          data: { nameAr: data.name },
        });
        await tx.user.update({
          where: { id: branch.userId },
          data: { name: data.name },
        });
      }
      return next;
    });
    return updated;
  }

  async transfer(user: AuthUser, dto: CreateTransferDto) {
    if (!dto.items?.length) {
      throw new BadRequestException('أضف أصنافاً للتحويل');
    }
    const main = await this.prisma.branch.findFirst({
      where: { isMain: true, isActive: true },
    });
    if (!main) throw new NotFoundException('الفرع الرئيسي غير معرف');
    const dest = await this.prisma.branch.findUnique({
      where: { id: dto.toBranchId },
    });
    if (!dest || !dest.isActive) {
      throw new NotFoundException('فرع الوجهة غير موجود');
    }
    if (dest.id === main.id) {
      throw new BadRequestException('التحويل من الفرع الرئيسي إلى فرع آخر فقط');
    }

    return this.inventory.withTransaction(async (tx) => {
      for (const item of dto.items) {
        await this.inventory.transferBetweenWarehouses({
          tx,
          fromWarehouseId: main.warehouseId,
          toWarehouseId: dest.warehouseId,
          variantId: item.variantId,
          quantity: item.quantity,
          actorId: user.id,
          reference: `TR-${main.username}-${dest.username}`,
          notes: dto.notes,
        });
      }

      const transfer = await tx.stockTransfer.create({
        data: {
          fromBranchId: main.id,
          toBranchId: dest.id,
          notes: dto.notes,
          createdById: user.id,
          items: {
            create: dto.items.map((i) => ({
              variantId: i.variantId,
              quantity: i.quantity,
            })),
          },
        },
        include: {
          fromBranch: { select: { id: true, name: true } },
          toBranch: { select: { id: true, name: true } },
          items: {
            include: {
              variant: { include: { product: { select: { nameAr: true } } } },
            },
          },
        },
      });

      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: 'branch.transfer',
          entityType: 'StockTransfer',
          entityId: transfer.id,
          meta: { toBranchId: dest.id, items: dto.items.length },
        },
      });

      return transfer;
    });
  }

  listTransfers() {
    return this.prisma.stockTransfer.findMany({
      orderBy: { createdAt: 'desc' },
      take: 80,
      include: {
        fromBranch: { select: { id: true, name: true } },
        toBranch: { select: { id: true, name: true } },
        items: {
          include: {
            variant: { include: { product: { select: { nameAr: true } } } },
          },
        },
      },
    });
  }

  async myStock(user: AuthUser) {
    if (!user.branch?.id) {
      throw new BadRequestException('هذا الحساب غير مرتبط بفرع');
    }
    return this.prisma.stockItem.findMany({
      where: { branchId: user.branch.id },
      include: {
        variant: { include: { product: { select: { nameAr: true, status: true } } } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }
}
