import { ValidateIf } from 'class-validator';

/** Largest amount DECIMAL(12,2) can store. */
export const MAX_MONEY = 9_999_999_999.99;

/** Business cap for stock quantities; keeps cumulative stock well inside int4. */
export const MAX_STOCK_QTY = 1_000_000;

/**
 * Optional, but never null. Use on non-nullable columns: unlike @IsOptional (which skips
 * validation for null too), null still runs the other validators and is rejected with a 400.
 */
export const Optional = () => ValidateIf((_, value) => value !== undefined);
