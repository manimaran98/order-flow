import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InsufficientStockException } from '../common/exceptions.js';
import { paginate, PaginationQueryDto, skipTake } from '../common/pagination.js';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AdjustStockDto } from './dto/adjust-stock.dto.js';

export type StockLine = { productId: string; quantity: number };
type OrderRef = { orderId: string; userId: string };

// Taking row locks in a consistent order prevents deadlocks between concurrent multi-item confirms.
const byProductId = (lines: StockLine[]) => [...lines].sort((a, b) => a.productId.localeCompare(b.productId));

const stockSelect = {
  id: true,
  name: true,
  sku: true,
  stockQuantity: true,
  lowStockThreshold: true,
  isActive: true,
} satisfies Prisma.ProductSelect;

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async list(q: PaginationQueryDto) {
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({ select: stockSelect, orderBy: { name: 'asc' }, ...skipTake(q) }),
      this.prisma.product.count(),
    ]);
    return paginate(
      rows.map((p) => ({ ...p, isLow: p.stockQuantity <= p.lowStockThreshold })),
      total,
      q,
    );
  }

  lowStock() {
    return this.prisma.product.findMany({
      where: { isActive: true, stockQuantity: { lte: this.prisma.product.fields.lowStockThreshold } },
      select: stockSelect,
      orderBy: { stockQuantity: 'asc' },
    });
  }

  async ledger(productId: string, q: PaginationQueryDto) {
    const product = await this.prisma.product.findUnique({ where: { id: productId }, select: stockSelect });
    if (!product) throw new NotFoundException('Product not found');
    const where = { productId };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.inventoryTransaction.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        ...skipTake(q),
      }),
      this.prisma.inventoryTransaction.count({ where }),
    ]);
    return { product, transactions: paginate(data, total, q) };
  }

  async adjust(dto: AdjustStockDto, userId: string) {
    if (dto.type === 'RESTOCK' && dto.quantity <= 0) throw new BadRequestException('RESTOCK quantity must be positive');
    if (dto.type === 'ADJUSTMENT' && !dto.note?.trim()) throw new BadRequestException('ADJUSTMENT requires a note');

    return this.prisma.$transaction(async (tx) => {
      if (dto.quantity > 0) {
        const r = await tx.product.updateMany({
          where: { id: dto.productId },
          data: { stockQuantity: { increment: dto.quantity } },
        });
        if (r.count === 0) throw new NotFoundException('Product not found');
      } else {
        await this.take(tx, dto.productId, -dto.quantity);
      }
      const transaction = await tx.inventoryTransaction.create({
        data: {
          productId: dto.productId,
          type: dto.type,
          quantity: dto.quantity,
          referenceType: 'MANUAL',
          note: dto.note,
          createdById: userId,
        },
      });
      const product = await tx.product.findUniqueOrThrow({ where: { id: dto.productId }, select: stockSelect });
      return { product, transaction };
    });
  }

  /** Deducts every line or none: the first shortfall throws and rolls back the caller's transaction. */
  async deductForOrder(tx: Prisma.TransactionClient, lines: StockLine[], ref: OrderRef) {
    const sorted = byProductId(lines);
    for (const l of sorted) await this.take(tx, l.productId, l.quantity);
    await tx.inventoryTransaction.createMany({
      data: sorted.map((l) => ({
        productId: l.productId,
        type: 'SALE' as const,
        quantity: -l.quantity,
        referenceType: 'ORDER' as const,
        referenceId: ref.orderId,
        createdById: ref.userId,
      })),
    });
  }

  async restoreForOrder(tx: Prisma.TransactionClient, lines: StockLine[], ref: OrderRef) {
    const sorted = byProductId(lines);
    for (const l of sorted) {
      await tx.product.update({ where: { id: l.productId }, data: { stockQuantity: { increment: l.quantity } } });
    }
    await tx.inventoryTransaction.createMany({
      data: sorted.map((l) => ({
        productId: l.productId,
        type: 'RETURN' as const,
        quantity: l.quantity,
        referenceType: 'ORDER' as const,
        referenceId: ref.orderId,
        createdById: ref.userId,
      })),
    });
  }

  /**
   * Atomically removes `quantity` units. The WHERE guard is the lock: Postgres re-checks
   * `stock_quantity >= quantity` against the committed row, so concurrent takers cannot oversell.
   */
  private async take(tx: Prisma.TransactionClient, productId: string, quantity: number) {
    const r = await tx.product.updateMany({
      where: { id: productId, stockQuantity: { gte: quantity } },
      data: { stockQuantity: { decrement: quantity } },
    });
    if (r.count === 1) return;
    const p = await tx.product.findUnique({ where: { id: productId }, select: { sku: true, stockQuantity: true } });
    if (!p) throw new NotFoundException('Product not found');
    throw new InsufficientStockException(p.sku, quantity, p.stockQuantity);
  }
}
