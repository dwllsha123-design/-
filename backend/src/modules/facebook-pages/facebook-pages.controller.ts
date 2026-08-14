import { Body, Controller, Delete, Get, Param, Patch, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { FacebookPagesService } from './facebook-pages.service';
import {
  AssignEmployeesDto,
  AssignMemberDto,
  CreateFacebookPageDto,
  UpdateFacebookPageDto,
} from './dto/facebook-page.dto';
import { RequirePermissions } from '../../common/decorators/auth.decorators';
import { PERMISSIONS } from '../../common/permissions';
import {
  CurrentUser,
  AuthUser,
} from '../../common/decorators/current-user.decorator';

@ApiTags('Facebook Pages')
@ApiBearerAuth()
@Controller('facebook-pages')
export class FacebookPagesController {
  constructor(private readonly facebookPagesService: FacebookPagesService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.FACEBOOK_PAGES_VIEW)
  findAll(@CurrentUser() user: AuthUser) {
    return this.facebookPagesService.findAll(user);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.FACEBOOK_PAGES_VIEW)
  findOne(@Param('id') id: string) {
    return this.facebookPagesService.findOne(id);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.FACEBOOK_PAGES_MANAGE)
  create(@Body() dto: CreateFacebookPageDto) {
    return this.facebookPagesService.create(dto);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.FACEBOOK_PAGES_MANAGE)
  update(@Param('id') id: string, @Body() dto: UpdateFacebookPageDto) {
    return this.facebookPagesService.update(id, dto);
  }

  @Post(':id/members')
  @RequirePermissions(PERMISSIONS.FACEBOOK_PAGES_MANAGE)
  assignMember(@Param('id') id: string, @Body() dto: AssignMemberDto) {
    return this.facebookPagesService.assignMember(id, dto);
  }

  @Delete(':id/members/:userId')
  @RequirePermissions(PERMISSIONS.FACEBOOK_PAGES_MANAGE)
  removeMember(@Param('id') id: string, @Param('userId') userId: string) {
    return this.facebookPagesService.removeMember(id, userId);
  }

  @Put(':id/employees')
  @RequirePermissions(PERMISSIONS.FACEBOOK_PAGES_MANAGE)
  assignEmployees(@Param('id') id: string, @Body() dto: AssignEmployeesDto) {
    return this.facebookPagesService.assignEmployees(id, dto.userIds);
  }
}
