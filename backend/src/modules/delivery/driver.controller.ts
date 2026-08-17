import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { LocalOrderStatus } from '@prisma/client';
import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { RequirePermissions } from '../../common/decorators/auth.decorators';
import { PERMISSIONS } from '../../common/permissions';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { DriverService } from './driver.service';

class LocationDto {
  @IsNumber()
  lat!: number;

  @IsNumber()
  lng!: number;
}

class DriverStatusDto {
  @IsEnum(LocalOrderStatus)
  localStatus!: LocalOrderStatus;
}

class DriverReturnDto {
  @IsString()
  barcode!: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

@ApiTags('Driver')
@ApiBearerAuth()
@Controller('driver')
export class DriverController {
  constructor(private readonly driver: DriverService) {}

  @Get('me')
  @RequirePermissions(PERMISSIONS.ORDERS_VIEW)
  me(@CurrentUser() user: AuthUser) {
    return this.driver.me(user);
  }

  @Get('orders')
  @RequirePermissions(PERMISSIONS.ORDERS_VIEW)
  orders(@CurrentUser() user: AuthUser) {
    return this.driver.myOrders(user);
  }

  @Post('heartbeat')
  @RequirePermissions(PERMISSIONS.ORDERS_VIEW)
  heartbeat(@CurrentUser() user: AuthUser) {
    return this.driver.heartbeat(user);
  }

  @Post('location')
  @RequirePermissions(PERMISSIONS.ORDERS_VIEW)
  location(@CurrentUser() user: AuthUser, @Body() dto: LocationDto) {
    return this.driver.pingLocation(user, dto.lat, dto.lng);
  }

  @Patch('orders/:id/status')
  @RequirePermissions(PERMISSIONS.ORDERS_VIEW)
  status(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: DriverStatusDto,
  ) {
    return this.driver.updateOrderStatus(user, id, dto.localStatus);
  }

  @Get('returns/scan/:barcode')
  @RequirePermissions(PERMISSIONS.INVENTORY_ADJUST)
  scan(@Param('barcode') barcode: string) {
    return this.driver.lookupBarcode(barcode);
  }

  @Post('returns')
  @RequirePermissions(PERMISSIONS.INVENTORY_ADJUST)
  returns(@CurrentUser() user: AuthUser, @Body() dto: DriverReturnDto) {
    return this.driver.returnByBarcode(user, dto.barcode);
  }
}
