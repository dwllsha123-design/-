import { Module } from '@nestjs/common';
import { AccuratessService } from './accuratess.service';
import { OrderFulfillmentService } from './order-fulfillment.service';
import { CouriersService } from './couriers.service';
import { CouriersController } from './couriers.controller';

@Module({
  controllers: [CouriersController],
  providers: [AccuratessService, OrderFulfillmentService, CouriersService],
  exports: [AccuratessService, OrderFulfillmentService, CouriersService],
})
export class FulfillmentModule {}
