import { OmitType, PartialType } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/pagination.js';
import { ToBoolean } from '../../common/transforms.js';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @Matches(/^[A-Za-z0-9._-]{1,50}$/, { message: 'sku may contain letters, digits, dot, dash, underscore (max 50)' })
  sku: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  sellingPrice: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  costPrice: number;

  /** Opening stock only; later changes go through /inventory/adjustments. */
  @IsOptional()
  @IsInt()
  @Min(0)
  stockQuantity?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  lowStockThreshold?: number;
}

export class UpdateProductDto extends PartialType(OmitType(CreateProductDto, ['stockQuantity'] as const)) {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ListProductsQuery extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @ToBoolean()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @ToBoolean()
  @IsBoolean()
  lowStock?: boolean;
}
