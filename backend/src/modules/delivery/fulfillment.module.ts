import { Module } from '@nestjs/common';
import { AccuratessService } from './accuratess.service';
import { OrderFulfillmentService } from './order-fulfillment.service';
import { CouriersService } from './couriers.service';
import { CouriersController } from './couriers.controller';
import { DriverService } from './driver.service';
import { DriverController } from './driver.controller';
import { ReturnsModule } from '../returns/returns.module';

@Module({
  imports: [ReturnsModule],
  controllers: [CouriersController, DriverController],
  providers: [AccuratessService, OrderFulfillmentService, CouriersService, DriverService],
  exports: [AccuratessService, OrderFulfillmentService, CouriersService],
})
export class FulfillmentModule {}
