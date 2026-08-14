import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateUserDto,
  MarketerRegisterDto,
  UpdateUserDto,
} from './dto/user.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { ROLE_CODES } from '../../common/permissions';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  findAll() {
    return this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        status: true,
        locale: true,
        createdAt: true,
        roles: { include: { role: true } },
      },
    });
  }

  listRoles() {
    return this.prisma.role.findMany({
      orderBy: { nameAr: 'asc' },
      include: {
        permissions: { include: { permission: true } },
      },
    });
  }

  pendingMarketers() {
    return this.prisma.user.findMany({
      where: {
        status: 'PENDING',
        roles: { some: { role: { code: ROLE_CODES.SALES_AGENT } } },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        status: true,
        createdAt: true,
        roles: { include: { role: true } },
      },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        roles: { include: { role: true } },
        facebookPages: { include: { page: true } },
      },
    });
    if (!user) throw new NotFoundException('المستخدم غير موجود');
    const { passwordHash: _, ...safe } = user;
    return safe;
  }

  async create(dto: CreateUserDto) {
    if (!dto.email && !dto.phone) {
      throw new BadRequestException('يجب إدخال بريد أو هاتف');
    }

    const roles = await this.prisma.role.findMany({
      where: { code: { in: dto.roleCodes } },
    });
    if (roles.length !== dto.roleCodes.length) {
      throw new BadRequestException('دور غير صالح');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    return this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        passwordHash,
        roles: {
          create: roles.map((r) => ({ roleId: r.id })),
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        status: true,
        roles: { include: { role: true } },
      },
    });
  }

  async registerMarketer(dto: MarketerRegisterDto) {
    if (!dto.phone) throw new BadRequestException('رقم الهاتف مطلوب');
    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [
          { phone: dto.phone },
          dto.email ? { email: dto.email } : undefined,
        ].filter(Boolean) as Array<{ phone?: string; email?: string }>,
      },
    });
    if (existing) {
      throw new BadRequestException('يوجد حساب بهذا الهاتف أو البريد');
    }

    const role = await this.prisma.role.findUnique({
      where: { code: ROLE_CODES.SALES_AGENT },
    });
    if (!role) throw new BadRequestException('دور المسوق غير مُعرّف');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        passwordHash,
        status: 'PENDING',
        locale: 'ar',
        roles: { create: [{ roleId: role.id }] },
      },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        status: true,
        createdAt: true,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        action: 'marketer.register',
        entityType: 'User',
        entityId: user.id,
        meta: { phone: dto.phone, city: dto.city || 'طرابلس' },
      },
    });

    await this.notifications.notifyRole('super_admin', {
      titleAr: `مسوق جديد بانتظار الموافقة: ${user.name}`,
      bodyAr: `هاتف: ${user.phone}${dto.city ? ` — ${dto.city}` : ' — طرابلس'}`,
      type: 'MARKETER_PENDING',
      entityType: 'User',
      entityId: user.id,
    });
    await this.notifications.notifyRole('admin', {
      titleAr: `مسوق جديد بانتظار الموافقة: ${user.name}`,
      bodyAr: `هاتف: ${user.phone}${dto.city ? ` — ${dto.city}` : ' — طرابلس'}`,
      type: 'MARKETER_PENDING',
      entityType: 'User',
      entityId: user.id,
    });

    return {
      message: 'تم إرسال طلبك. ستتمكن من الدخول بعد موافقة الإدارة.',
      user,
    };
  }

  async approveMarketer(actor: AuthUser, id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { roles: { include: { role: true } } },
    });
    if (!user) throw new NotFoundException('المستخدم غير موجود');
    const isAgent = user.roles.some((r) => r.role.code === ROLE_CODES.SALES_AGENT);
    if (!isAgent) {
      throw new BadRequestException('المستخدم ليس مسوقاً');
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: { status: 'ACTIVE' },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        status: true,
        roles: { include: { role: true } },
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: actor.id,
        action: 'marketer.approve',
        entityType: 'User',
        entityId: id,
      },
    });

    await this.notifications.notifyUsers([id], {
      titleAr: 'تمت الموافقة على حسابك',
      bodyAr: 'يمكنك الآن تسجيل الدخول وإدخال الطلبات.',
      type: 'MARKETER_APPROVED',
      entityType: 'User',
      entityId: id,
    });

    return updated;
  }

  async rejectMarketer(actor: AuthUser, id: string) {
    const updated = await this.prisma.user.update({
      where: { id },
      data: { status: 'INACTIVE' },
      select: { id: true, name: true, status: true },
    });
    await this.prisma.auditLog.create({
      data: {
        userId: actor.id,
        action: 'marketer.reject',
        entityType: 'User',
        entityId: id,
      },
    });
    return updated;
  }

  async update(id: string, dto: UpdateUserDto) {
    await this.findOne(id);

    return this.prisma.$transaction(async (tx) => {
      if (dto.roleCodes) {
        const roles = await tx.role.findMany({
          where: { code: { in: dto.roleCodes } },
        });
        await tx.userRole.deleteMany({ where: { userId: id } });
        await tx.userRole.createMany({
          data: roles.map((r) => ({ userId: id, roleId: r.id })),
        });
      }

      return tx.user.update({
        where: { id },
        data: {
          name: dto.name,
          email: dto.email,
          phone: dto.phone,
          status: dto.status,
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          status: true,
          roles: { include: { role: true } },
        },
      });
    });
  }
}
