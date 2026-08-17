import {
  IsArray,
  IsEmail,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class StoreRegisterDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsString()
  phone!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  area?: string;

  @IsOptional()
  @IsString()
  address?: string;
}

export class StoreCheckoutItemDto {
  @IsString()
  variantId!: string;

  @IsNumber()
  @Min(1)
  quantity!: number;
}

export class StoreCheckoutDto {
  @IsString()
  name!: string;

  @IsString()
  phone!: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  area?: string;

  @IsOptional()
  @IsIn(['MALE', 'FEMALE'])
  deliveryGender?: 'MALE' | 'FEMALE';

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  landmark?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @IsOptional()
  @IsString()
  attributionToken?: string;

  /** رمز الصفحة العامة عند الدخول برابط ?page=1025 بدون ref */
  @IsOptional()
  @IsNumber()
  pagePublicCode?: number;

  @IsOptional()
  @IsNumber()
  agentPublicCode?: number;

  @IsOptional()
  @IsString()
  promoCode?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StoreCheckoutItemDto)
  items!: StoreCheckoutItemDto[];
}

export class StoreTrackDto {
  @IsString()
  orderNumber!: string;

  @IsString()
  phone!: string;
}

export class UpdateStoreProfileDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  area?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  landmark?: string;

  @IsOptional()
  @IsString()
  whatsapp?: string;
}
