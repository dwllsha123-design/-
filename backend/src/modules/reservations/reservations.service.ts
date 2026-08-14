import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CentralInventoryService } from '../inventory/services/central-inventory.service';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { CreateReservationDto } from './dto/reservation.dto';

@Injectable()
export class ReservationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventory: CentralInventoryService,
  ) {}

  private isAdmin(user: AuthUser) {
    return user.roles.includes('super_admin') || user.roles.includes('admin');
  }

  async create(user: AuthUser, dto: CreateReservationDto) {
    const warehouseId =
      dto.warehouseId || (await this.inventory.defaultWarehouseId());

    let pageId = dto.pageId;
    if (!this.isAdmin(user)) {
      const memberships = await this.prisma.facebookPageEmployee.findMany({
        where: { userId: user.id },
      });
      if (!memberships.length) {
        throw new ForbiddenException('يجب ربط المندوب بصفحة أولاً');
      }
      if (pageId && !memberships.some((m) => m.pageId === pageId)) {
        throw new ForbiddenException('غير مسموح الحجز لهذه الصفحة');
      }
      pageId = pageId || memberships[0].pageId;
    }

    const expiresAt = new Date(
      Date.now() + 1000 * 60 * (dto.expiresInMinutes ?? 60 * 24),
    );

    return this.inventory.withTransaction(async (tx) => {
      await this.inventory.reserve({
        tx,
        warehouseId,
        variantId: dto.variantId,
        quantity: dto.quantity,
        actorId: user.id,
        reference: 'AGENT_RESERVE',
        reason: 'agent_reservation',
        notes: dto.notes,
      });

      return tx.stockReservation.create({
        data: {
          warehouseId,
          variantId: dto.variantId,
          quantity: dto.quantity,
          status: 'ACTIVE',
          agentUserId: user.id,
          pageId,
          expiresAt,
          notes: dto.notes,
        },
        include: {
          variant: { include: { product: true } },
          page: true,
        },
      });
    });
  }

  async mine(user: AuthUser) {
    const where = this.isAdmin(user) ? {} : { agentUserId: user.id };
    return this.prisma.stockReservation.findMany({
      where: { ...where, status: 'ACTIVE' },
      include: {
        variant: { include: { product: true } },
        page: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async cancel(user: AuthUser, id: string, reason?: string) {
    const reservation = await this.prisma.stockReservation.findUnique({
      where: { id },
    });
    if (!reservation) throw new NotFoundException('الحجز غير موجود');
    if (reservation.status !== 'ACTIVE') {
      throw new BadRequestException('الحجز غير نشط');
    }
    if (!this.isAdmin(user) && reservation.agentUserId !== user.id) {
      throw new ForbiddenException('لا يمكنك إلغاء حجز مندوب آخر');
    }

    return this.inventory.withTransaction(async (tx) => {
      await this.inventory.releaseReservation({
        tx,
        warehouseId: reservation.warehouseId,
        variantId: reservation.variantId,
        quantity: reservation.quantity,
        actorId: user.id,
        reference: reservation.id,
        reason: reason || 'reservation_cancelled',
      });

      return tx.stockReservation.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          releasedAt: new Date(),
          notes: reason || reservation.notes,
        },
      });
    });
  }
}
