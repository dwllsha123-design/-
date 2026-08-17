import { Controller, Get, Header, Res } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Response } from 'express';
import { Public } from '../../common/decorators/auth.decorators';
import { MobileService } from './mobile.service';

/** Apple Universal Links + Android App Links (no /api/v1 prefix) */
@ApiExcludeController()
@Controller('.well-known')
export class WellKnownController {
  constructor(private readonly mobileService: MobileService) {}

  @Public()
  @Get('apple-app-site-association')
  @Header('Content-Type', 'application/json')
  apple(@Res() res: Response) {
    return res.status(200).json(this.mobileService.appleAppSiteAssociation());
  }

  @Public()
  @Get('assetlinks.json')
  @Header('Content-Type', 'application/json')
  async android(@Res() res: Response) {
    return res.status(200).json(await this.mobileService.assetLinks());
  }
}
