import { IsIn, IsInt, IsOptional, IsString, IsUUID, MaxLength, NotEquals } from 'class-validator';

export class AdjustStockDto {
  @IsUUID()
  productId: string;

  @IsIn(['RESTOCK', 'ADJUSTMENT'])
  type: 'RESTOCK' | 'ADJUSTMENT';

  /** Signed: RESTOCK must be > 0; ADJUSTMENT may be negative. */
  @IsInt()
  @NotEquals(0)
  quantity: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
