import { Module } from '@nestjs/common';
import { ReferralService } from './referral.service';
import { ReferralController, ReferralRedirectController } from './referral.controller';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [InventoryModule],
  controllers: [ReferralController, ReferralRedirectController],
  providers: [ReferralService],
  exports: [ReferralService],
})
export class ReferralModule {}
