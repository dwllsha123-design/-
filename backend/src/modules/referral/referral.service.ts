import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { CodeSequenceService } from '../inventory/services/code-sequence.service';

@Injectable()
export class ReferralService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly codes: CodeSequenceService,
    private readonly config: ConfigService,
  ) {}

  private storeUrl() {
    return this.config.get<string>('STORE_URL') || 'http://localhost:5174';
  }

  private deepLinkScheme() {
    return this.config.get<string>('MOBILE_DEEP_LINK_SCHEME') || 'daronotha';
  }

  private apiPublicUrl() {
    return this.config.get<string>('APP_URL') || 'http://localhost:3000';
  }

  /** روابط فريدة للصفحة */
  pageLinks(pageCode: number, agentCode?: number) {
    const store = this.storeUrl().replace(/\/$/, '');
    const api = this.apiPublicUrl().replace(/\/$/, '');
    const shortPath =
      agentCode != null ? `/r/${pageCode}/${agentCode}` : `/r/${pageCode}`;
    const storePath =
      agentCode != null
        ? `${store}/?page=${pageCode}&agent=${agentCode}`
        : `${store}/?page=${pageCode}`;
    return {
      shortLink: `${api}${shortPath}`,
      storefrontLink: storePath,
      deepLink: `${this.deepLinkScheme()}://r/${pageCode}${agentCode != null ? `/${agentCode}` : ''}`,
      path: shortPath,
    };
  }

  async resolve(pageCode: number, agentCode?: number, meta?: { ip?: string; ua?: string }) {
    const page = await this.prisma.facebookPage.findFirst({
      where: { publicCode: pageCode, status: 'ACTIVE' },
    });
    if (!page) throw new NotFoundException('الصفحة غير موجودة');

    let agentUserId: string | undefined;
    if (agentCode != null) {
      const member = await this.prisma.facebookPageEmployee.findFirst({
        where: {
          pageId: page.id,
          agentCode,
          role: 'AGENT',
        },
        include: { user: true },
      });
      if (!member || member.user.status !== 'ACTIVE') {
        throw new NotFoundException('المندوب غير مرتبط بهذه الصفحة');
      }
      agentUserId = member.userId;
    }

    const token = this.codes.attributionToken();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14);

    const visit = await this.prisma.referralVisit.create({
      data: {
        pageId: page.id,
        pageCode,
        agentCode: agentCode ?? null,
        agentUserId,
        attributionToken: token,
        ip: meta?.ip,
        userAgent: meta?.ua,
        landingPath: agentCode != null ? `/r/${pageCode}/${agentCode}` : `/r/${pageCode}`,
        expiresAt,
      },
    });

    const redirectUrl = new URL(this.storeUrl());
    redirectUrl.searchParams.set('ref', token);
    redirectUrl.searchParams.set('page', String(pageCode));
    if (agentCode != null) redirectUrl.searchParams.set('agent', String(agentCode));

    const links = this.pageLinks(pageCode, agentCode);

    return {
      redirectUrl: redirectUrl.toString(),
      deepLink: links.deepLink,
      attributionToken: token,
      page: {
        id: page.id,
        name: page.name,
        pageCode: page.publicCode,
      },
      agent: agentCode != null ? { agentCode, userId: agentUserId } : null,
      visitId: visit.id,
      expiresAt,
      links,
    };
  }

  async getAttribution(token: string) {
    const visit = await this.prisma.referralVisit.findUnique({
      where: { attributionToken: token },
      include: { page: true },
    });
    if (!visit) throw new NotFoundException('رمز الإحالة غير صالح');
    if (visit.expiresAt < new Date()) {
      throw new BadRequestException('انتهت صلاحية رابط الإحالة');
    }
    return {
      visitId: visit.id,
      pageId: visit.pageId,
      pageCode: visit.pageCode,
      pageName: visit.page.name,
      agentCode: visit.agentCode,
      agentUserId: visit.agentUserId,
      source: visit.agentCode != null ? 'REFERRAL_AGENT' : 'REFERRAL_PAGE',
    };
  }

  async assertAgentOwnsPage(userId: string, pageId: string) {
    const link = await this.prisma.facebookPageEmployee.findUnique({
      where: { pageId_userId: { pageId, userId } },
    });
    if (!link) throw new ForbiddenException('غير مرتبط بهذه الصفحة');
    return link;
  }
}
