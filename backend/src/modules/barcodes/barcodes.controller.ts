import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsArray, IsString } from 'class-validator';
import { BarcodesService } from './barcodes.service';
import { RequirePermissions } from '../../common/decorators/auth.decorators';
import { PERMISSIONS } from '../../common/permissions';
import {
  CurrentUser,
  AuthUser,
} from '../../common/decorators/current-user.decorator';

class PrintBarcodesDto {
  @IsArray()
  @IsString({ each: true })
  variantIds!: string[];
}

@ApiTags('Barcodes')
@ApiBearerAuth()
@Controller('barcodes')
export class BarcodesController {
  constructor(private readonly barcodesService: BarcodesService) {}

  @Post('variants/:variantId/generate')
  @RequirePermissions(PERMISSIONS.PRODUCTS_EDIT)
  generateOne(@Param('variantId') variantId: string) {
    return this.barcodesService.generateVariantBarcode(variantId);
  }

  @Post('variants/generate-missing')
  @RequirePermissions(PERMISSIONS.PRODUCTS_EDIT)
  generateMissing() {
    return this.barcodesService.generateMissing();
  }

  @Post('print')
  @RequirePermissions(PERMISSIONS.PRODUCTS_VIEW)
  print(@Body() dto: PrintBarcodesDto) {
    return this.barcodesService.printPayload(dto.variantIds);
  }

  @Get('lookup/:code')
  @RequirePermissions(PERMISSIONS.POS_SELL)
  lookup(@CurrentUser() user: AuthUser, @Param('code') code: string) {
    return this.barcodesService.lookupVariant(decodeURIComponent(code), user);
  }

  @Get('orders/:orderId')
  @RequirePermissions(PERMISSIONS.ORDERS_VIEW)
  orderBarcode(@Param('orderId') orderId: string) {
    return this.barcodesService.orderBarcode(orderId);
  }
}
