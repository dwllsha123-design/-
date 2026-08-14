import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { InventoryMovementType } from '@prisma/client';

export class AdjustStockDto {
  @IsString()
  warehouseId!: string;

  @IsString()
  variantId!: string;

  @IsEnum(InventoryMovementType)
  type!: InventoryMovementType;

  @IsInt()
  quantity!: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  reference?: string;
}

export class CreateWarehouseDto {
  @IsString()
  code!: string;

  @IsString()
  nameAr!: string;

  @IsOptional()
  @IsString()
  nameEn?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  isDefault?: boolean;
}
