import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { BranchesService } from './branches.service';
import {
  CreateBranchDto,
  CreateTransferDto,
  UpdateBranchDto,
} from './dto/branch.dto';
import { RequirePermissions } from '../../common/decorators/auth.decorators';
import { PERMISSIONS } from '../../common/permissions';
import {
  CurrentUser,
  AuthUser,
} from '../../common/decorators/current-user.decorator';

@ApiTags('Branches')
@ApiBearerAuth()
@Controller('branches')
export class BranchesController {
  constructor(private readonly branches: BranchesService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.BRANCHES_MANAGE)
  list() {
    return this.branches.list();
  }

  @Get('transfers')
  @RequirePermissions(PERMISSIONS.BRANCHES_MANAGE)
  transfers() {
    return this.branches.listTransfers();
  }

  @Get('me/stock')
  @RequirePermissions(PERMISSIONS.POS_SELL)
  myStock(@CurrentUser() user: AuthUser) {
    return this.branches.myStock(user);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.BRANCHES_MANAGE)
  get(@Param('id') id: string) {
    return this.branches.get(id);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.BRANCHES_MANAGE)
  create(@Body() dto: CreateBranchDto) {
    return this.branches.create(dto);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.BRANCHES_MANAGE)
  update(@Param('id') id: string, @Body() dto: UpdateBranchDto) {
    return this.branches.update(id, dto);
  }

  @Post('transfers')
  @RequirePermissions(PERMISSIONS.BRANCHES_MANAGE)
  transfer(@CurrentUser() user: AuthUser, @Body() dto: CreateTransferDto) {
    return this.branches.transfer(user, dto);
  }
}
