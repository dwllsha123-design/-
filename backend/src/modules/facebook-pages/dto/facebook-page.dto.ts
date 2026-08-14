import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { FacebookPageStatus, PageMemberRole } from '@prisma/client';

export class CreateFacebookPageDto {
  @IsString()
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  publicCode?: number;

  @IsOptional()
  @IsString()
  pageId?: string;

  @IsOptional()
  @IsString()
  managerId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateFacebookPageDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  pageId?: string;

  @IsOptional()
  @IsEnum(FacebookPageStatus)
  status?: FacebookPageStatus;

  @IsOptional()
  @IsString()
  managerId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class AssignMemberDto {
  @IsString()
  userId!: string;

  @IsEnum(PageMemberRole)
  role!: PageMemberRole;

  @IsOptional()
  @IsInt()
  @Min(1)
  agentCode?: number;
}

export class AssignEmployeesDto {
  @IsArray()
  @ArrayMaxSize(3)
  @IsString({ each: true })
  userIds!: string[];
}
