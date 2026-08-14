import { Module } from '@nestjs/common';
import { DeliveryService } from './delivery.service';
import { DeliveryController } from './delivery.controller';
import { StoreModule } from '../store/store.module';
import { AccuratessService } from './accuratess.service';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [StoreModule, InventoryModule],
  controllers: [DeliveryController],
  providers: [DeliveryService, AccuratessService],
  exports: [DeliveryService, AccuratessService],
})
export class DeliveryModule {}
