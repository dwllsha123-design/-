import { Module } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';
import { CentralInventoryService } from './services/central-inventory.service';
import { CodeSequenceService } from './services/code-sequence.service';

@Module({
  controllers: [InventoryController],
  providers: [InventoryService, CentralInventoryService, CodeSequenceService],
  exports: [InventoryService, CentralInventoryService, CodeSequenceService],
})
export class InventoryModule {}
