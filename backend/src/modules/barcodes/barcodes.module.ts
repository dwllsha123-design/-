import { Module } from '@nestjs/common';
import { BarcodesService } from './barcodes.service';
import { BarcodesController } from './barcodes.controller';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [InventoryModule],
  controllers: [BarcodesController],
  providers: [BarcodesService],
  exports: [BarcodesService],
})
export class BarcodesModule {}
