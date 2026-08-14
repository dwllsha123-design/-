import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ReservationsService } from './reservations.service';
import {
  CancelReservationDto,
  CreateReservationDto,
} from './dto/reservation.dto';
import { RequirePermissions } from '../../common/decorators/auth.decorators';
import { PERMISSIONS } from '../../common/permissions';
import {
  AuthUser,
  CurrentUser,
} from '../../common/decorators/current-user.decorator';

@ApiTags('Reservations')
@ApiBearerAuth()
@Controller('reservations')
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.INVENTORY_VIEW)
  mine(@CurrentUser() user: AuthUser) {
    return this.reservationsService.mine(user);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.ORDERS_CREATE)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateReservationDto) {
    return this.reservationsService.create(user, dto);
  }

  @Post(':id/cancel')
  @RequirePermissions(PERMISSIONS.ORDERS_CREATE)
  cancel(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CancelReservationDto,
  ) {
    return this.reservationsService.cancel(user, id, dto.reason);
  }
}
