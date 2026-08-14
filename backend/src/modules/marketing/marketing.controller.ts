import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  MarketingService,
} from './marketing.service';
import { UpsertBannerDto, UpsertPromoDto, UpdateBannerDto, UpdatePromoDto } from './marketing.dto';
import {
  Public,
  RequirePermissions,
} from '../../common/decorators/auth.decorators';
import { PERMISSIONS } from '../../common/permissions';
import {
  AuthUser,
  CurrentUser,
} from '../../common/decorators/current-user.decorator';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

class ValidatePromoDto {
  @IsString()
  code!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  subtotal?: number;
}

@ApiTags('Marketing')
@Controller()
export class MarketingController {
  constructor(private readonly marketing: MarketingService) {}

  @Get('marketing/promos')
  @ApiBearerAuth()
  @RequirePermissions(PERMISSIONS.MARKETING_MANAGE)
  listPromos() {
    return this.marketing.listPromos();
  }

  @Post('marketing/promos')
  @ApiBearerAuth()
  @RequirePermissions(PERMISSIONS.MARKETING_MANAGE)
  createPromo(@CurrentUser() user: AuthUser, @Body() dto: UpsertPromoDto) {
    return this.marketing.createPromo(user, dto);
  }

  @Patch('marketing/promos/:id')
  @ApiBearerAuth()
  @RequirePermissions(PERMISSIONS.MARKETING_MANAGE)
  updatePromo(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdatePromoDto,
  ) {
    return this.marketing.updatePromo(user, id, dto);
  }

  @Get('marketing/banners')
  @ApiBearerAuth()
  @RequirePermissions(PERMISSIONS.MARKETING_MANAGE)
  listBanners() {
    return this.marketing.listBannersAdmin();
  }

  @Post('marketing/banners')
  @ApiBearerAuth()
  @RequirePermissions(PERMISSIONS.MARKETING_MANAGE)
  createBanner(@CurrentUser() user: AuthUser, @Body() dto: UpsertBannerDto) {
    return this.marketing.createBanner(user, dto);
  }

  @Patch('marketing/banners/:id')
  @ApiBearerAuth()
  @RequirePermissions(PERMISSIONS.MARKETING_MANAGE)
  updateBanner(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateBannerDto,
  ) {
    return this.marketing.updateBanner(user, id, dto);
  }

  @Public()
  @Get('store/banners')
  storeBanners() {
    return this.marketing.activeBanners();
  }

  @Public()
  @Post('store/promo/validate')
  validate(@Body() dto: ValidatePromoDto) {
    return this.marketing.validatePromo(dto.code, dto.subtotal ?? 0);
  }
}
