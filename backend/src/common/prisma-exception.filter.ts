import { ArgumentsHost, Catch, ExceptionFilter, Logger } from '@nestjs/common';
import type { Response } from 'express';
import { Prisma } from '../generated/prisma/client.js';

const UNIQUE_MESSAGES: Record<string, string> = {
  products_sku_key: 'SKU already exists',
  users_email_key: 'Email already registered',
  orders_order_number_key: 'Order number already exists',
};

const ERROR_NAMES: Record<number, string> = {
  400: 'Bad Request',
  404: 'Not Found',
  409: 'Conflict',
  500: 'Internal Server Error',
};

type DriverMeta = { driverAdapterError?: { cause?: { originalCode?: string; constraint?: { index?: string } } } };

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(err: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const { status, message } = this.map(err);
    if (status === 500) this.logger.error(err.message, err.stack);
    host
      .switchToHttp()
      .getResponse<Response>()
      .status(status)
      .json({ statusCode: status, message, error: ERROR_NAMES[status] });
  }

  private map(err: Prisma.PrismaClientKnownRequestError): { status: number; message: string } {
    // With driver adapters the Postgres SQLSTATE is the reliable signal: CHECK violations
    // arrive as P2039 from ORM calls but P2010 from raw queries.
    const cause = (err.meta as DriverMeta | undefined)?.driverAdapterError?.cause;
    const pg = cause?.originalCode;
    if (err.code === 'P2002' || pg === '23505') {
      const index = cause?.constraint?.index;
      return { status: 409, message: (index && UNIQUE_MESSAGES[index]) || 'Duplicate value' };
    }
    if (err.code === 'P2025') return { status: 404, message: 'Record not found' };
    if (err.code === 'P2003' || pg === '23503') return { status: 400, message: 'Referenced record does not exist' };
    if (pg === '23514') return { status: 409, message: 'Operation violates a data integrity rule' };
    if (pg === '22003') return { status: 400, message: 'Numeric value out of range' };
    return { status: 500, message: 'Internal server error' };
  }
}
