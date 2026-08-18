import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { PromoDiscountType } from '@prisma/client';

export class UpsertPromoDto {
  @IsString()
  code!: string;

  @IsOptional()
  @IsString()
  nameAr?: string;

  @IsEnum(PromoDiscountType)
  type!: PromoDiscountType;

  @IsNumber()
  @Min(0)
  value!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minOrder?: number;

  @IsOptional()
  @IsNumber()
  maxUses?: number | null;

  @IsOptional()
  @IsString()
  startsAt?: string | null;

  @IsOptional()
  @IsString()
  endsAt?: string | null;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class UpdatePromoDto {
  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  nameAr?: string;

  @IsOptional()
  @IsEnum(PromoDiscountType)
  type?: PromoDiscountType;

  @IsOptional()
  @IsNumber()
  @Min(0)
  value?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minOrder?: number;

  @IsOptional()
  @IsNumber()
  maxUses?: number | null;

  @IsOptional()
  @IsString()
  startsAt?: string | null;

  @IsOptional()
  @IsString()
  endsAt?: string | null;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class UpsertBannerDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  subtitle?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  linkUrl?: string;

  @IsOptional()
  @IsIn(['HERO', 'PROMO'])
  placement?: 'HERO' | 'PROMO';

  @IsOptional()
  @IsIn(['cover', 'contain'])
  imageFit?: 'cover' | 'contain';

  @IsOptional()
  @IsInt()
  @Min(50)
  @Max(250)
  imageZoom?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  imagePosX?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  imagePosY?: number;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsString()
  startsAt?: string | null;

  @IsOptional()
  @IsString()
  endsAt?: string | null;
}

export class UpdateBannerDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  subtitle?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  linkUrl?: string;

  @IsOptional()
  @IsIn(['HERO', 'PROMO'])
  placement?: 'HERO' | 'PROMO';

  @IsOptional()
  @IsIn(['cover', 'contain'])
  imageFit?: 'cover' | 'contain';

  @IsOptional()
  @IsInt()
  @Min(50)
  @Max(250)
  imageZoom?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  imagePosX?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  imagePosY?: number;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsString()
  startsAt?: string | null;

  @IsOptional()
  @IsString()
  endsAt?: string | null;
}
