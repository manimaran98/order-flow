import { IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../common/pagination.js';

export class ListCatalogQuery extends PaginationQueryDto {
  /** Matches product name only; SKUs are internal. */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}
