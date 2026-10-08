import { Injectable, NotFoundException } from '@nestjs/common';
import { paginate, skipTake } from '../common/pagination.js';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ListCatalogQuery } from './dto/catalog.dto.js';

/**
 * Columns the public catalog may read. stockQuantity is selected only to derive `inStock`
 * and never leaves this service; cost, SKU, thresholds and timestamps are never read.
 */
const catalogSelect = {
  id: true,
  name: true,
  description: true,
  sellingPrice: true,
  stockQuantity: true,
} satisfies Prisma.ProductSelect;

type CatalogRow = Prisma.ProductGetPayload<{ select: typeof catalogSelect }>;

const toCatalogItem = ({ id, name, description, sellingPrice, stockQuantity }: CatalogRow) => ({
  id,
  name,
  description,
  sellingPrice,
  inStock: stockQuantity > 0,
});

export type CatalogItem = ReturnType<typeof toCatalogItem>;

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(q: ListCatalogQuery) {
    const where: Prisma.ProductWhereInput = {
      isActive: true,
      ...(q.search && { name: { contains: q.search, mode: 'insensitive' } }),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({ where, select: catalogSelect, orderBy: { name: 'asc' }, ...skipTake(q) }),
      this.prisma.product.count({ where }),
    ]);
    return paginate(rows.map(toCatalogItem), total, q);
  }

  async findOne(id: string) {
    const row = await this.prisma.product.findFirst({ where: { id, isActive: true }, select: catalogSelect });
    if (!row) throw new NotFoundException('Product not found');
    return toCatalogItem(row);
  }
}
