import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { LocalOrderStatus } from '@prisma/client';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { RequirePermissions } from '../../common/decorators/auth.decorators';
import { PERMISSIONS } from '../../common/permissions';
import { CouriersService } from './couriers.service';
import { OrderFulfillmentService } from './order-fulfillment.service';

class CourierBodyDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  userId?: string;
}

class LocalStatusDto {
  @IsEnum(LocalOrderStatus)
  localStatus!: LocalOrderStatus;
}

class AssignCourierDto {
  @IsString()
  courierId!: string;
}

@ApiTags('Couriers / Fulfillment')
@ApiBearerAuth()
@Controller()
export class CouriersController {
  constructor(
    private readonly couriers: CouriersService,
    private readonly fulfillment: OrderFulfillmentService,
  ) {}

  @Get('couriers')
  @RequirePermissions(PERMISSIONS.ORDERS_VIEW)
  list(@Query('active') active?: string) {
    return this.couriers.list(active === '1');
  }

  @Post('couriers')
  @RequirePermissions(PERMISSIONS.DELIVERY_ASSIGN)
  create(@Body() dto: CourierBodyDto) {
    return this.couriers.create(dto);
  }

  @Patch('couriers/:id')
  @RequirePermissions(PERMISSIONS.DELIVERY_ASSIGN)
  update(@Param('id') id: string, @Body() dto: Partial<CourierBodyDto>) {
    return this.couriers.update(id, dto);
  }

  @Delete('couriers/:id')
  @RequirePermissions(PERMISSIONS.DELIVERY_ASSIGN)
  remove(@Param('id') id: string) {
    return this.couriers.remove(id);
  }

  @Post('orders/:id/fulfill')
  @RequirePermissions(PERMISSIONS.DELIVERY_ASSIGN)
  fulfill(@Param('id') id: string) {
    return this.fulfillment.routeOrder(id);
  }

  @Post('orders/:id/assign-courier')
  @RequirePermissions(PERMISSIONS.DELIVERY_ASSIGN)
  assignCourier(@Param('id') id: string, @Body() dto: AssignCourierDto) {
    return this.fulfillment.assignCourier(id, dto.courierId);
  }

  @Patch('orders/:id/local-status')
  @RequirePermissions(PERMISSIONS.DELIVERY_ASSIGN)
  localStatus(@Param('id') id: string, @Body() dto: LocalStatusDto) {
    return this.fulfillment.updateLocalStatus(id, dto.localStatus);
  }
}
