import { IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min, NotEquals } from 'class-validator';
import { MAX_STOCK_QTY } from '../../common/validation.js';

export class AdjustStockDto {
  @IsUUID()
  productId: string;

  @IsIn(['RESTOCK', 'ADJUSTMENT'])
  type: 'RESTOCK' | 'ADJUSTMENT';

  /** Signed: RESTOCK must be > 0; ADJUSTMENT may be negative. */
  @IsInt()
  @NotEquals(0)
  @Min(-MAX_STOCK_QTY)
  @Max(MAX_STOCK_QTY)
  quantity: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
