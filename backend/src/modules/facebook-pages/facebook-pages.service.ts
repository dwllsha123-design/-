import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PageMemberRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { CodeSequenceService } from '../inventory/services/code-sequence.service';
import { ConfigService } from '@nestjs/config';
import {
  AssignMemberDto,
  CreateFacebookPageDto,
  UpdateFacebookPageDto,
} from './dto/facebook-page.dto';

@Injectable()
export class FacebookPagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly codes: CodeSequenceService,
    private readonly config: ConfigService,
  ) {}

  private storeUrl() {
    return (this.config.get<string>('STORE_URL') || 'http://localhost:5174').replace(/\/$/, '');
  }

  private apiUrl() {
    return (this.config.get<string>('APP_URL') || 'http://localhost:3000').replace(/\/$/, '');
  }

  private linksFor(pageCode: number, agentCode?: number | null) {
    const shortPath =
      agentCode != null ? `/r/${pageCode}/${agentCode}` : `/r/${pageCode}`;
    return {
      referralLink: shortPath,
      shortUrl: `${this.apiUrl()}${shortPath}`,
      storefrontUrl:
        agentCode != null
          ? `${this.storeUrl()}/?page=${pageCode}&agent=${agentCode}`
          : `${this.storeUrl()}/?page=${pageCode}`,
    };
  }

  async findAll(user: AuthUser) {
    const isAdmin =
      user.roles.includes('super_admin') || user.roles.includes('admin');

    const pages = await this.prisma.facebookPage.findMany({
      where: isAdmin
        ? undefined
        : { employees: { some: { userId: user.id } }, status: 'ACTIVE' },
      include: {
        manager: { select: { id: true, name: true, phone: true } },
        employees: {
          include: {
            user: { select: { id: true, name: true, phone: true, email: true } },
          },
        },
        _count: { select: { orders: true } },
      },
      orderBy: { publicCode: 'asc' },
    });

    return pages.map((p) => {
      const links = this.linksFor(p.publicCode);
      return {
        ...p,
        ...links,
        members: {
          manager: p.manager,
          admins: p.employees.filter((e) => e.role === 'ADMIN'),
          agents: p.employees.filter((e) => e.role === 'AGENT'),
        },
      };
    });
  }

  async findOne(id: string) {
    const page = await this.prisma.facebookPage.findUnique({
      where: { id },
      include: {
        manager: { select: { id: true, name: true, phone: true } },
        employees: {
          include: {
            user: { select: { id: true, name: true, phone: true, email: true } },
          },
        },
        orders: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          select: {
            id: true,
            orderNumber: true,
            status: true,
            totalAmount: true,
            pagePublicCode: true,
            agentPublicCode: true,
            createdAt: true,
          },
        },
      },
    });
    if (!page) throw new NotFoundException('الصفحة غير موجودة');
    return {
      ...page,
      ...this.linksFor(page.publicCode),
      agents: page.employees
        .filter((e) => e.role === 'AGENT' && e.agentCode != null)
        .map((e) => ({
          userId: e.userId,
          name: e.user.name,
          agentCode: e.agentCode,
          ...this.linksFor(page.publicCode, e.agentCode),
        })),
    };
  }

  async create(dto: CreateFacebookPageDto) {
    const publicCode =
      dto.publicCode ?? (await this.codes.nextCode('page_public_code', 1025));

    return this.prisma.facebookPage.create({
      data: {
        name: dto.name,
        publicCode,
        pageId: dto.pageId,
        managerId: dto.managerId,
        notes: dto.notes,
      },
    });
  }

  async update(id: string, dto: UpdateFacebookPageDto) {
    await this.findOne(id);
    return this.prisma.facebookPage.update({ where: { id }, data: dto });
  }

  async assignMember(pageId: string, dto: AssignMemberDto) {
    const page = await this.prisma.facebookPage.findUnique({ where: { id: pageId } });
    if (!page) throw new NotFoundException('الصفحة غير موجودة');

    const user = await this.prisma.user.findUnique({ where: { id: dto.userId } });
    if (!user) throw new BadRequestException('المستخدم غير موجود');

    if (dto.role === 'ADMIN') {
      const admins = await this.prisma.facebookPageEmployee.count({
        where: { pageId, role: 'ADMIN' },
      });
      const existing = await this.prisma.facebookPageEmployee.findUnique({
        where: { pageId_userId: { pageId, userId: dto.userId } },
      });
      if (!existing && admins >= 2) {
        throw new BadRequestException('الحد الأقصى أدمنان لكل صفحة');
      }
    }

    if (dto.role === 'MANAGER') {
      await this.prisma.facebookPage.update({
        where: { id: pageId },
        data: { managerId: dto.userId },
      });
    }

    let agentCode = dto.agentCode ?? null;
    if (dto.role === 'AGENT') {
      agentCode =
        dto.agentCode ?? (await this.codes.nextCode('agent_public_code', 2050));
    } else {
      agentCode = null;
    }

    await this.prisma.facebookPageEmployee.upsert({
      where: { pageId_userId: { pageId, userId: dto.userId } },
      create: {
        pageId,
        userId: dto.userId,
        role: dto.role,
        agentCode,
      },
      update: {
        role: dto.role,
        agentCode,
      },
    });

    return this.findOne(pageId);
  }

  async removeMember(pageId: string, userId: string) {
    await this.prisma.facebookPageEmployee.delete({
      where: { pageId_userId: { pageId, userId } },
    });
    return this.findOne(pageId);
  }

  /** Legacy helper kept for older admin UI */
  async assignEmployees(id: string, userIds: string[]) {
    if (userIds.length > 3) {
      throw new BadRequestException('الحد الأقصى 3 موظفين في التعيين السريع');
    }
    for (const userId of userIds) {
      await this.assignMember(id, { userId, role: PageMemberRole.AGENT });
    }
    return this.findOne(id);
  }
}
