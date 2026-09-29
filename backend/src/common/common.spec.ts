import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { money } from './money.js';
import { paginate, PaginationQueryDto, skipTake } from './pagination.js';
import { businessDate, startOfBusinessDay } from './time.js';

describe('money', () => {
  it('serializes to two decimals in JSON', () => {
    expect(JSON.stringify({ total: money('10.1') })).toBe('{"total":"10.10"}');
  });

  it('does exact decimal arithmetic', () => {
    expect(money(0.1).add(money(0.2)).equals(money('0.30'))).toBe(true);
  });
});

describe('business time (Asia/Kuala_Lumpur)', () => {
  const lateUtc = new Date('2026-09-29T16:30:00Z'); // 00:30 on 30 Sep in MYT

  it('uses the Malaysian calendar day', () => {
    expect(businessDate(lateUtc)).toBe('2026-09-30');
  });

  it('finds MYT midnight as a UTC instant', () => {
    expect(startOfBusinessDay(lateUtc).toISOString()).toBe('2026-09-29T16:00:00.000Z');
  });
});

describe('pagination', () => {
  const parse = (raw: object) => plainToInstance(PaginationQueryDto, raw);

  it('defaults to page 1, limit 20', () => {
    expect(skipTake(parse({}))).toEqual({ skip: 0, take: 20 });
  });

  it('coerces query strings', () => {
    expect(skipTake(parse({ page: '3', limit: '10' }))).toEqual({ skip: 20, take: 10 });
  });

  it.each([{ limit: '0' }, { limit: '101' }, { page: '0' }, { page: 'abc' }])(
    'rejects %o',
    (raw) => {
      expect(validateSync(parse(raw))).not.toHaveLength(0);
    },
  );

  it('builds meta', () => {
    expect(paginate(['a'], 41, parse({ limit: '20' })).meta).toEqual({
      page: 1,
      limit: 20,
      total: 41,
      totalPages: 3,
    });
  });
});
