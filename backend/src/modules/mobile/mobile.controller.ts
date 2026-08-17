import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { MobileService } from './mobile.service';
import { RegisterDeviceDto } from './dto/mobile.dto';
import { Public } from '../../common/decorators/auth.decorators';
import { AuthService } from '../auth/auth.service';

@ApiTags('Mobile')
@Controller('mobile')
export class MobileController {
  constructor(
    private readonly mobileService: MobileService,
    private readonly authService: AuthService,
  ) {}

  @Public()
  @Get('bootstrap')
  bootstrap(
    @Query('platform') platform?: string,
    @Query('version') version?: string,
  ) {
    return this.mobileService.bootstrap(platform, version);
  }

  @Public()
  @Post('devices')
  async registerDevice(
    @Body() dto: RegisterDeviceDto,
    @Headers('authorization') authorization?: string,
  ) {
    const userId = await this.authService.optionalUserId(authorization);
    return this.mobileService.registerDevice(dto, userId);
  }

  @Public()
  @Delete('devices/:deviceId')
  async unregisterDevice(
    @Param('deviceId') deviceId: string,
    @Headers('authorization') authorization?: string,
  ) {
    const userId = await this.authService.optionalUserId(authorization);
    return this.mobileService.unregisterDevice(deviceId, userId);
  }
}
