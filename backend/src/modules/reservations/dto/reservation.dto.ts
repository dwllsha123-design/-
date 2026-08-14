import { IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateReservationDto {
  @IsString()
  variantId!: string;

  @IsOptional()
  @IsString()
  warehouseId?: string;

  @IsInt()
  @Min(1)
  quantity!: number;

  @IsOptional()
  @IsString()
  pageId?: string;

  @IsOptional()
  @IsInt()
  expiresInMinutes?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CancelReservationDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
