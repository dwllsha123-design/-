import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { ReturnsService } from './returns.service';
import { RequirePermissions } from '../../common/decorators/auth.decorators';
import { PERMISSIONS } from '../../common/permissions';
import {
  AuthUser,
  CurrentUser,
} from '../../common/decorators/current-user.decorator';

class ReturnToStockDto {
  @IsString()
  barcode!: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

@ApiTags('Returns')
@ApiBearerAuth()
@Controller('returns')
export class ReturnsController {
  constructor(private readonly returnsService: ReturnsService) {}

  @Get('scan/:barcode')
  @RequirePermissions(PERMISSIONS.INVENTORY_ADJUST)
  scan(@Param('barcode') barcode: string) {
    return this.returnsService.lookupByBarcode(barcode);
  }

  @Post('to-stock')
  @RequirePermissions(PERMISSIONS.INVENTORY_ADJUST)
  toStock(@CurrentUser() user: AuthUser, @Body() dto: ReturnToStockDto) {
    return this.returnsService.returnToStock(user, dto.barcode, dto.reason);
  }
}
