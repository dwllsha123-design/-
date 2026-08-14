import { Controller, Get, Param, ParseIntPipe, Req, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { Public } from '../../common/decorators/auth.decorators';
import { ReferralService } from './referral.service';

/** Public short links: /r/1025 and /r/1025/2050 (excluded from api prefix) */
@ApiTags('Referral Redirect')
@Controller('r')
export class ReferralRedirectController {
  constructor(private readonly referralService: ReferralService) {}

  @Public()
  @Get(':pageCode')
  async pageOnly(
    @Param('pageCode', ParseIntPipe) pageCode: number,
    @Req() req: { ip?: string; headers: Record<string, string | undefined> },
    @Res() res: Response,
  ) {
    const result = await this.referralService.resolve(pageCode, undefined, {
      ip: req.ip,
      ua: req.headers['user-agent'],
    });
    return res.redirect(302, result.redirectUrl);
  }

  @Public()
  @Get(':pageCode/:agentCode')
  async withAgent(
    @Param('pageCode', ParseIntPipe) pageCode: number,
    @Param('agentCode', ParseIntPipe) agentCode: number,
    @Req() req: { ip?: string; headers: Record<string, string | undefined> },
    @Res() res: Response,
  ) {
    const result = await this.referralService.resolve(pageCode, agentCode, {
      ip: req.ip,
      ua: req.headers['user-agent'],
    });
    return res.redirect(302, result.redirectUrl);
  }
}

@ApiTags('Referral')
@Controller('referral')
export class ReferralController {
  constructor(private readonly referralService: ReferralService) {}

  @Public()
  @Get('resolve/:pageCode')
  resolvePage(
    @Param('pageCode', ParseIntPipe) pageCode: number,
    @Req() req: { ip?: string; headers: Record<string, string | undefined> },
  ) {
    return this.referralService.resolve(pageCode, undefined, {
      ip: req.ip,
      ua: req.headers['user-agent'],
    });
  }

  @Public()
  @Get('resolve/:pageCode/:agentCode')
  resolveAgent(
    @Param('pageCode', ParseIntPipe) pageCode: number,
    @Param('agentCode', ParseIntPipe) agentCode: number,
    @Req() req: { ip?: string; headers: Record<string, string | undefined> },
  ) {
    return this.referralService.resolve(pageCode, agentCode, {
      ip: req.ip,
      ua: req.headers['user-agent'],
    });
  }

  @Public()
  @Get('attribution/:token')
  attribution(@Param('token') token: string) {
    return this.referralService.getAttribution(token);
  }
}
