import { IsEmail, IsIn, IsOptional, IsString, MinLength, ValidateIf } from 'class-validator';

export class LoginDto {
  /** حقل ذكي: رقم هاتف أو بريد أو اسم مستخدم */
  @IsOptional()
  @IsString()
  identifier?: string;

  @IsOptional()
  @ValidateIf((o: LoginDto) => Boolean(o.email))
  @IsEmail({}, { message: 'البريد الإلكتروني غير صالح' })
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsString({ message: 'كلمة المرور مطلوبة' })
  @MinLength(6, { message: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' })
  password!: string;

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
