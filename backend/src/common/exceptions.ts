import { ConflictException } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client.js';

export class InsufficientStockException extends ConflictException {
  constructor(sku: string, requested: number, available: number) {
    super({
      statusCode: 409,
      error: 'Conflict',
      message: `Insufficient stock for ${sku}: requested ${requested}, available ${available}`,
      sku,
      requested,
      available,
    });
  }
}

export class InvalidStatusTransitionException extends ConflictException {
  constructor(from: string, to: string) {
    super(`Cannot change status from ${from} to ${to}`);
  }
}

export class OverpaymentException extends ConflictException {
  constructor(outstanding: Prisma.Decimal) {
    super(`Payment exceeds outstanding amount (RM ${outstanding.toFixed(2)})`);
  }
}
