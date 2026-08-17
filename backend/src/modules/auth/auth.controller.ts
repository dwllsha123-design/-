import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { LogoutDto, RefreshTokenDto } from './dto/refresh.dto';
import { Public } from '../../common/decorators/auth.decorators';
import {
  CurrentUser,
  AuthUser,
} from '../../common/decorators/current-user.decorator';
import { clientMetaFromRequest } from '../../common/client-context';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  login(
    @Body() dto: LoginDto,
    @Req() req: { ip?: string; headers: Record<string, string | string[] | undefined> },
  ) {
    return this.authService.login(dto, clientMetaFromRequest(req, dto));
  }

  @Public()
  @Post('refresh')
  refresh(
    @Body() dto: RefreshTokenDto,
    @Req() req: { ip?: string; headers: Record<string, string | string[] | undefined> },
  ) {
    return this.authService.refresh(dto.refreshToken, clientMetaFromRequest(req, dto));
  }

  @Public()
  @Post('logout')
  logout(@Body() dto: LogoutDto) {
    return this.authService.logout(dto.refreshToken);
  }

  @ApiBearerAuth()
  @Post('logout-all')
  logoutAll(@CurrentUser() user: AuthUser) {
    return this.authService.logoutAll(user.id);
  }

  @ApiBearerAuth()
  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.authService.me(user.id);
  }
}
