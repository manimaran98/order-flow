import { ArgumentsHost } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaExceptionFilter } from './prisma-exception.filter.js';

function run(code: string, cause?: object) {
  const err = new Prisma.PrismaClientKnownRequestError('db error', {
    code,
    clientVersion: '7.10.0',
    meta: cause ? { driverAdapterError: { cause } } : undefined,
  });
  const json = vi.fn();
  const status = vi.fn(() => ({ json }));
  const host = { switchToHttp: () => ({ getResponse: () => ({ status }) }) } as unknown as ArgumentsHost;
  new PrismaExceptionFilter().catch(err, host);
  return json.mock.calls[0][0];
}

describe('PrismaExceptionFilter', () => {
  it('maps a duplicate SKU to 409 with a readable message', () => {
    expect(run('P2002', { originalCode: '23505', constraint: { index: 'products_sku_key' } })).toEqual({
      statusCode: 409,
      message: 'SKU already exists',
      error: 'Conflict',
    });
  });

  it('maps a missing record to 404', () => {
    expect(run('P2025').statusCode).toBe(404);
  });

  it('maps a CHECK violation from ORM or raw queries to 409', () => {
    expect(run('P2039', { originalCode: '23514' }).statusCode).toBe(409);
    expect(run('P2010', { originalCode: '23514' }).statusCode).toBe(409);
  });

  it('maps a numeric overflow to 400', () => {
    expect(run('P2020', { originalCode: '22003' }).statusCode).toBe(400);
  });

  it('maps a foreign key violation to 400', () => {
    expect(run('P2003').statusCode).toBe(400);
  });

  it('hides unknown errors behind a 500', () => {
    expect(run('P9999')).toEqual({ statusCode: 500, message: 'Internal server error', error: 'Internal Server Error' });
  });
});
