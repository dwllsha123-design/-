import { IsIn, IsOptional, IsString } from 'class-validator';

export class RegisterDeviceDto {
  @IsString()
  deviceId!: string;

  @IsIn(['ANDROID', 'IOS', 'WEB', 'ADMIN'])
  platform!: 'ANDROID' | 'IOS' | 'WEB' | 'ADMIN';

  @IsOptional()
  @IsString()
  pushToken?: string;

  @IsOptional()
  @IsIn(['FCM', 'APNS'])
  pushProvider?: 'FCM' | 'APNS';

  @IsOptional()
  @IsString()
  appVersion?: string;

  @IsOptional()
  @IsString()
  osVersion?: string;

  @IsOptional()
  @IsString()
  locale?: string;
}
