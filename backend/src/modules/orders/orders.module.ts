import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { InventoryModule } from '../inventory/inventory.module';
import { CommissionsModule } from '../commissions/commissions.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { FulfillmentModule } from '../delivery/fulfillment.module';
import { StoreModule } from '../store/store.module';

@Module({
  imports: [
    InventoryModule,
    CommissionsModule,
    NotificationsModule,
    FulfillmentModule,
    StoreModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
