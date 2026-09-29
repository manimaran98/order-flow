import { Prisma } from '../generated/prisma/client.js';

// ponytail: global prototype patch so every Decimal in any response serializes as "12.30";
// replace with a response interceptor if a library ever needs Decimal's default JSON.
(Prisma.Decimal.prototype as { toJSON?: () => string }).toJSON = function (this: Prisma.Decimal) {
  return this.toFixed(2);
};

export const money = (value: string | number | Prisma.Decimal) => new Prisma.Decimal(value).toDecimalPlaces(2);

export const ZERO = money(0);
