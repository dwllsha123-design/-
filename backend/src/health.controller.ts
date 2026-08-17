import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from './common/decorators/auth.decorators';

@ApiTags('Health')
@SkipThrottle()
@Controller()
export class HealthController {
  @Public()
  @Get('health')
  health() {
    return {
      status: 'ok',
      service: 'dar-alunotha-api',
      timestamp: new Date().toISOString(),
    };
  }
}
