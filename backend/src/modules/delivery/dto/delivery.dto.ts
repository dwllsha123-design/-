import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { DeliveryStatus, DeliveryType } from '@prisma/client';
export class CreateDeliveryCompanyDto {
  @IsString()
  nameAr!: string;

  @IsOptional()
  @IsString()
  nameEn?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  apiUrl?: string;

  @IsOptional()
  @IsString()
  apiKey?: string;
}

export class AssignDeliveryDto {
  @IsString()
  orderId!: string;

  @IsOptional()
  @IsEnum(DeliveryType)
  type?: DeliveryType;

  @IsOptional()
  @IsString()
  agentId?: string;

  @IsOptional()
  @IsString()
  companyId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  fee?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateDeliveryStatusDto {
  @IsEnum(DeliveryStatus)
  status!: DeliveryStatus;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  trackingNumber?: string;
}

export class BulkSlipsDto {
  @IsArray()
  @IsString({ each: true })
  ids!: string[];
}
