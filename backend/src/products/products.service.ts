import { Injectable, NotFoundException } from '@nestjs/common';
import { money } from '../common/money.js';
import { paginate, skipTake } from '../common/pagination.js';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateProductDto, ListProductsQuery, UpdateProductDto } from './dto/product.dto.js';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(q: ListProductsQuery) {
    const where: Prisma.ProductWhereInput = {
      ...(q.search && {
        OR: [
          { name: { contains: q.search, mode: 'insensitive' } },
          { sku: { contains: q.search, mode: 'insensitive' } },
        ],
      }),
      ...(q.active !== undefined && { isActive: q.active }),
      ...(q.lowStock && { stockQuantity: { lte: this.prisma.product.fields.lowStockThreshold } }),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({ where, orderBy: { name: 'asc' }, ...skipTake(q) }),
      this.prisma.product.count({ where }),
    ]);
    return paginate(data, total, q);
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  create(dto: CreateProductDto, userId: string) {
    const { stockQuantity = 0, sellingPrice, costPrice, ...rest } = dto;
    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: { ...rest, sellingPrice: money(sellingPrice), costPrice: money(costPrice), stockQuantity },
      });
      if (stockQuantity > 0) {
        await tx.inventoryTransaction.create({
          data: {
            productId: product.id,
            type: 'RESTOCK',
            quantity: stockQuantity,
            referenceType: 'MANUAL',
            note: 'Opening stock',
            createdById: userId,
          },
        });
      }
      return product;
    });
  }

  async update(id: string, dto: UpdateProductDto) {
    await this.findOne(id);
    const { sellingPrice, costPrice, ...rest } = dto;
    return this.prisma.product.update({
      where: { id },
      data: {
        ...rest,
        ...(sellingPrice !== undefined && { sellingPrice: money(sellingPrice) }),
        ...(costPrice !== undefined && { costPrice: money(costPrice) }),
      },
    });
  }

  async deactivate(id: string) {
    await this.findOne(id);
    await this.prisma.product.update({ where: { id }, data: { isActive: false } });
  }
}
