import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { DeliveryService } from './delivery.service';
import {
  AssignDeliveryDto,
  BulkSlipsDto,
  CreateDeliveryCompanyDto,
  UpdateDeliveryStatusDto,
} from './dto/delivery.dto';
import { RequirePermissions } from '../../common/decorators/auth.decorators';
import { PERMISSIONS } from '../../common/permissions';
import {
  CurrentUser,
  AuthUser,
} from '../../common/decorators/current-user.decorator';

@ApiTags('Delivery')
@ApiBearerAuth()
@Controller('delivery')
export class DeliveryController {
  constructor(private readonly deliveryService: DeliveryService) {}

  @Get('quote')
  @RequirePermissions(PERMISSIONS.ORDERS_VIEW)
  quote(@Query('city') city?: string, @Query('area') area?: string) {
    return this.deliveryService.quote(city, area);
  }

  @Get('agents')
  @RequirePermissions(PERMISSIONS.DELIVERY_ASSIGN)
  listAgents() {
    return this.deliveryService.listAgents();
  }

  @Get('pending-orders')
  @RequirePermissions(PERMISSIONS.ORDERS_VIEW)
  pendingOrders(@CurrentUser() user: AuthUser) {
    return this.deliveryService.listPendingOrders(user);
  }

  @Get('companies')
  @RequirePermissions(PERMISSIONS.DELIVERY_ASSIGN)
  listCompanies() {
    return this.deliveryService.listCompanies();
  }

  @Post('companies')
  @RequirePermissions(PERMISSIONS.SETTINGS_MANAGE)
  createCompany(@Body() dto: CreateDeliveryCompanyDto) {
    return this.deliveryService.createCompany(dto);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.ORDERS_VIEW)
  list(
    @CurrentUser() user: AuthUser,
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('facebookPageId') facebookPageId?: string,
  ) {
    return this.deliveryService.listDeliveries(user, status, type, facebookPageId);
  }

  @Post('assign')
  @RequirePermissions(PERMISSIONS.DELIVERY_ASSIGN)
  assign(@CurrentUser() user: AuthUser, @Body() dto: AssignDeliveryDto) {
    return this.deliveryService.assign(user, dto);
  }

  @Post('slips/bulk')
  @RequirePermissions(PERMISSIONS.ORDERS_VIEW)
  bulkSlips(@CurrentUser() user: AuthUser, @Body() dto: BulkSlipsDto) {
    return this.deliveryService.getShippingSlipsBulk(user, dto);
  }

  @Post('sync-accuratess')
  @RequirePermissions(PERMISSIONS.DELIVERY_ASSIGN)
  syncAll(@CurrentUser() user: AuthUser) {
    return this.deliveryService.syncAllAccuratess(user);
  }

  @Post(':id/sync-accuratess')
  @RequirePermissions(PERMISSIONS.DELIVERY_ASSIGN)
  syncOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.deliveryService.syncAccuratess(user, id);
  }

  @Patch(':id/status')
  @RequirePermissions(PERMISSIONS.DELIVERY_ASSIGN)
  updateStatus(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateDeliveryStatusDto,
  ) {
    return this.deliveryService.updateStatus(user, id, dto);
  }

  @Get(':id/slip')
  @RequirePermissions(PERMISSIONS.ORDERS_VIEW)
  slip(@Param('id') id: string) {
    return this.deliveryService.getShippingSlip(id);
  }
}
