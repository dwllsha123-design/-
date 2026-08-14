import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { AdjustStockDto, CreateWarehouseDto } from './dto/inventory.dto';
import { RequirePermissions } from '../../common/decorators/auth.decorators';
import { PERMISSIONS } from '../../common/permissions';
import {
  CurrentUser,
  AuthUser,
} from '../../common/decorators/current-user.decorator';

@ApiTags('Inventory')
@ApiBearerAuth()
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('warehouses')
  @RequirePermissions(PERMISSIONS.INVENTORY_VIEW)
  listWarehouses() {
    return this.inventoryService.listWarehouses();
  }

  @Post('warehouses')
  @RequirePermissions(PERMISSIONS.INVENTORY_ADJUST)
  createWarehouse(@Body() dto: CreateWarehouseDto) {
    return this.inventoryService.createWarehouse(dto);
  }

  @Get('stock')
  @RequirePermissions(PERMISSIONS.INVENTORY_VIEW)
  listStock(@Query('warehouseId') warehouseId?: string) {
    return this.inventoryService.listStock(warehouseId);
  }

  @Get('available')
  @RequirePermissions(PERMISSIONS.INVENTORY_VIEW)
  available(
    @Query('variantId') variantId: string,
    @Query('warehouseId') warehouseId?: string,
  ) {
    return this.inventoryService.getAvailable(variantId, warehouseId);
  }

  @Post('adjust')
  @RequirePermissions(PERMISSIONS.INVENTORY_ADJUST)
  adjust(@CurrentUser() user: AuthUser, @Body() dto: AdjustStockDto) {
    return this.inventoryService.adjust(user, dto);
  }

  @Get('alerts')
  @RequirePermissions(PERMISSIONS.INVENTORY_VIEW)
  alerts() {
    return this.inventoryService.alerts();
  }

  @Get('movements')
  @RequirePermissions(PERMISSIONS.INVENTORY_VIEW)
  movements(@Query('limit') limit?: string) {
    return this.inventoryService.listMovements(limit ? Number(limit) : 100);
  }
}
