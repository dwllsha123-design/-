import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MobileController } from './mobile.controller';
import { MobileService } from './mobile.service';
import { PushService } from './push.service';
import { WellKnownController } from './well-known.controller';

@Module({
  imports: [AuthModule],
  controllers: [MobileController, WellKnownController],
  providers: [MobileService, PushService],
  exports: [PushService, MobileService],
})
export class MobileModule {}
