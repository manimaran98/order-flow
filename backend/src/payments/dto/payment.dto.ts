import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Max,
  MaxLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/pagination.js';
import { MAX_MONEY } from '../../common/validation.js';
import { PaymentMethod } from '../../generated/prisma/client.js';

export class CreatePaymentDto {
  @IsUUID()
  orderId: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Max(MAX_MONEY)
  amount: number;

  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  reference?: string;

  /** Defaults to now; may be backdated, never in the future. */
  @IsOptional()
  @IsDateString()
  paidAt?: string;
}

export class ListPaymentsQuery extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  orderId?: string;

  @IsOptional()
  @IsEnum(PaymentMethod)
  method?: PaymentMethod;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
