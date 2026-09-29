import { OmitType, PartialType } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/pagination.js';
import { ToBoolean } from '../../common/transforms.js';
import { MAX_MONEY, MAX_STOCK_QTY, Optional } from '../../common/validation.js';

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
  @Max(MAX_MONEY)
  sellingPrice: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(MAX_MONEY)
  costPrice: number;

  /** Opening stock only; later changes go through /inventory/adjustments. */
  @Optional()
  @IsInt()
  @Min(0)
  @Max(MAX_STOCK_QTY)
  stockQuantity?: number;

  @Optional()
  @IsInt()
  @Min(0)
  @Max(MAX_STOCK_QTY)
  lowStockThreshold?: number;
}

export class UpdateProductDto extends PartialType(OmitType(CreateProductDto, ['stockQuantity'] as const), {
  skipNullProperties: false,
}) {
  @Optional()
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
