import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export type UpsertCourierDto = {
  name: string;
  phone?: string;
  isActive?: boolean;
  notes?: string;
  userId?: string;
};

@Injectable()
export class CouriersService {
  constructor(private readonly prisma: PrismaService) {}

  list(activeOnly = false) {
    return this.prisma.courier.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: { name: 'asc' },
    });
  }

  create(dto: UpsertCourierDto) {
    return this.prisma.courier.create({
      data: {
        name: dto.name,
        phone: dto.phone,
        isActive: dto.isActive ?? true,
        notes: dto.notes,
        userId: dto.userId,
      },
    });
  }

  async update(id: string, dto: Partial<UpsertCourierDto>) {
    await this.ensure(id);
    return this.prisma.courier.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.ensure(id);
    return this.prisma.courier.delete({ where: { id } });
  }

  private async ensure(id: string) {
    const row = await this.prisma.courier.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('المندوب غير موجود');
    return row;
  }
}
