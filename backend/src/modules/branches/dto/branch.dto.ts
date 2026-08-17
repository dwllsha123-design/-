import {
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsBoolean,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateBranchDto {
  @IsString()
  @MinLength(2, { message: 'اسم الفرع مطلوب' })
  name!: string;

  @IsString()
  @MinLength(3, { message: 'اسم المستخدم 3 أحرف على الأقل' })
  username!: string;

  @IsString()
  @MinLength(6, { message: 'كلمة المرور 6 أحرف على الأقل' })
  password!: string;

  @IsIn(['WHOLESALE_RETAIL', 'RETAIL'])
  type!: 'WHOLESALE_RETAIL' | 'RETAIL';
}

export class UpdateBranchDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsIn(['WHOLESALE_RETAIL', 'RETAIL'])
  type?: 'WHOLESALE_RETAIL' | 'RETAIL';

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;
}

export class TransferItemDto {
  @IsString()
  variantId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;
}

export class CreateTransferDto {
  @IsString()
  toBranchId!: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TransferItemDto)
  items!: TransferItemDto[];
}
