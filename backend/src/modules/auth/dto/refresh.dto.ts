import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class RefreshTokenDto {
  @IsString()
  @MinLength(20)
  refreshToken!: string;

  @IsOptional()
  @IsString()
  deviceId?: string;

  @IsOptional()
  @IsIn(['ANDROID', 'IOS', 'WEB', 'ADMIN'])
  platform?: 'ANDROID' | 'IOS' | 'WEB' | 'ADMIN';

  @IsOptional()
  @IsString()
  appVersion?: string;
}

export class LogoutDto {
  @IsOptional()
  @IsString()
  refreshToken?: string;
}
