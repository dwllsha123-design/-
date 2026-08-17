import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PosService } from './pos.service';
import { CreatePosReturnDto, CreatePosSaleDto } from './dto/pos.dto';
import { RequirePermissions } from '../../common/decorators/auth.decorators';
import { PERMISSIONS } from '../../common/permissions';
import {
  CurrentUser,
  AuthUser,
} from '../../common/decorators/current-user.decorator';

@ApiTags('POS')
@ApiBearerAuth()
@Controller('pos')
export class PosController {
  constructor(private readonly posService: PosService) {}

  @Post('sell')
  @RequirePermissions(PERMISSIONS.POS_SELL)
  sell(@CurrentUser() user: AuthUser, @Body() dto: CreatePosSaleDto) {
    return this.posService.sell(user, dto);
  }

  @Get('invoice/:orderId')
  @RequirePermissions(PERMISSIONS.POS_SELL)
  invoice(@CurrentUser() user: AuthUser, @Param('orderId') orderId: string) {
    return this.posService.getInvoice(orderId, user);
  }

  @Post('return')
  @RequirePermissions(PERMISSIONS.POS_RETURN)
  returnSale(@CurrentUser() user: AuthUser, @Body() dto: CreatePosReturnDto) {
    return this.posService.returnSale(user, dto);
  }
}
