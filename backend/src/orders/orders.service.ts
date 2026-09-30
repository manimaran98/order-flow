import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InvalidStatusTransitionException } from '../common/exceptions.js';
import { money, ZERO } from '../common/money.js';
import { paginate, skipTake } from '../common/pagination.js';
import { CustomersService } from '../customers/customers.service.js';
import type { OrderStatus, Prisma } from '../generated/prisma/client.js';
import { InventoryService } from '../inventory/inventory.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateOrderDto, ListOrdersQuery, OrderItemInput, UpdateOrderDto } from './dto/order.dto.js';
import {
  calculateTotals,
  canTransition,
  derivePaymentStatus,
  formatOrderNumber,
  mergeLines,
  STOCK_HELD_STATUSES,
  type PricedLine,
} from './order-rules.js';

export const orderDetailInclude = {
  customer: { select: { id: true, name: true, phone: true } },
  items: { include: { product: { select: { id: true, name: true, sku: true } } }, orderBy: { id: 'asc' } },
  payments: { orderBy: { paidAt: 'asc' } },
} satisfies Prisma.OrderInclude;

export const withOutstanding = <T extends { total: Prisma.Decimal; paidAmount: Prisma.Decimal }>(order: T) => ({
  ...order,
  outstandingAmount: order.total.sub(order.paidAmount),
});

type StockWarning = { productId: string; sku: string; requested: number; available: number };

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly customers: CustomersService,
    private readonly inventory: InventoryService,
  ) {}

  async findAll(q: ListOrdersQuery) {
    const where: Prisma.OrderWhereInput = {
      status: q.status && { in: q.status },
      paymentStatus: q.paymentStatus && { in: q.paymentStatus },
      customerId: q.customerId,
      ...(q.search && {
        OR: [
          { orderNumber: { contains: q.search, mode: 'insensitive' } },
          { customer: { name: { contains: q.search, mode: 'insensitive' } } },
        ],
      }),
      ...((q.from || q.to) && {
        createdAt: { gte: q.from ? new Date(q.from) : undefined, lte: q.to ? new Date(q.to) : undefined },
      }),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        include: { customer: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        ...skipTake(q),
      }),
      this.prisma.order.count({ where }),
    ]);
    return paginate(rows.map(withOutstanding), total, q);
  }

  async findOne(id: string, tx: Prisma.TransactionClient = this.prisma) {
    const order = await tx.order.findUnique({ where: { id }, include: orderDetailInclude });
    if (!order) throw new NotFoundException('Order not found');
    return withOutstanding(order);
  }

  create(dto: CreateOrderDto, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      await this.customers.ensureExists(dto.customerId, tx);
      const { lines, stockWarnings } = await this.priceLines(tx, dto.items);
      const discount = money(dto.discount ?? 0);
      const { items, subtotal, total } = calculateTotals(lines, discount);
      const [{ n }] = await tx.$queryRaw<{ n: bigint }[]>`SELECT nextval('order_number_seq') AS n`;
      const order = await tx.order.create({
        data: {
          orderNumber: formatOrderNumber(n),
          customerId: dto.customerId,
          notes: dto.notes,
          subtotal,
          discount,
          total,
          paymentStatus: derivePaymentStatus(total, ZERO),
          createdById: userId,
          items: { create: items },
        },
        include: orderDetailInclude,
      });
      return { ...withOutstanding(order), stockWarnings };
    });
  }

  update(id: string, dto: UpdateOrderDto) {
    return this.prisma.$transaction(async (tx) => {
      // Claim first: taking the row lock before reading items means a concurrent edit, confirm or
      // payment either finished before us (and we read its result) or waits until we commit.
      const claimed = await tx.order.updateMany({ where: { id, status: 'PENDING' }, data: { updatedAt: new Date() } });
      if (claimed.count === 0) {
        if (!(await tx.order.count({ where: { id } }))) throw new NotFoundException('Order not found');
        throw new ConflictException('Only PENDING orders can be edited');
      }
      const order = await tx.order.findUniqueOrThrow({ where: { id }, include: { items: true } });
      if (dto.customerId) await this.customers.ensureExists(dto.customerId, tx);

      const lines: PricedLine[] = dto.items
        ? (await this.priceLines(tx, dto.items)).lines
        : order.items.map(({ productId, quantity, unitPrice }) => ({ productId, quantity, unitPrice }));
      const discount = dto.discount !== undefined ? money(dto.discount) : order.discount;
      const { items, subtotal, total } = calculateTotals(lines, discount);
      if (total.lt(order.paidAmount)) {
        throw new ConflictException(`New total is below the RM ${order.paidAmount.toFixed(2)} already paid`);
      }

      await tx.order.update({
        where: { id },
        data: {
          customerId: dto.customerId,
          notes: dto.notes,
          subtotal,
          discount,
          total,
          paymentStatus: derivePaymentStatus(total, order.paidAmount),
        },
      });

      if (dto.items) {
        await tx.orderItem.deleteMany({ where: { orderId: id } });
        await tx.orderItem.createMany({ data: items.map((i) => ({ ...i, orderId: id })) });
      }
      return this.findOne(id, tx);
    });
  }

  changeStatus(id: string, to: OrderStatus, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id }, select: { status: true } });
      if (!order) throw new NotFoundException('Order not found');
      if (!canTransition(order.status, to)) throw new InvalidStatusTransitionException(order.status, to);

      // Claim the transition: if another request changed the status first, this matches 0 rows.
      const now = new Date();
      const claimed = await tx.order.updateMany({
        where: { id, status: order.status },
        data: {
          status: to,
          ...(to === 'CONFIRMED' && { confirmedAt: now }),
          ...(to === 'CANCELLED' && { cancelledAt: now }),
          ...(to === 'DELIVERED' && { deliveredAt: now }),
        },
      });
      if (claimed.count === 0) throw new ConflictException('Order was changed by another request; please retry');

      // Read items only after the claim: we now hold the row lock, so a concurrent edit has either
      // committed its new items already or is waiting behind us.
      const lines = await tx.orderItem.findMany({ where: { orderId: id }, select: { productId: true, quantity: true } });
      const ref = { orderId: id, userId };
      if (to === 'CONFIRMED') await this.inventory.deductForOrder(tx, lines, ref);
      if (to === 'CANCELLED' && STOCK_HELD_STATUSES.includes(order.status)) {
        await this.inventory.restoreForOrder(tx, lines, ref);
      }
      return this.findOne(id, tx);
    });
  }

  async remove(id: string) {
    const r = await this.prisma.order.deleteMany({ where: { id, status: 'PENDING', payments: { none: {} } } });
    if (r.count === 1) return;
    if (!(await this.prisma.order.count({ where: { id } }))) throw new NotFoundException('Order not found');
    throw new ConflictException('Only PENDING orders without payments can be deleted; cancel it instead');
  }

  /** Merges duplicate lines, snapshots prices, rejects missing/inactive products, and reports stock shortfalls. */
  private async priceLines(tx: Prisma.TransactionClient, input: OrderItemInput[]) {
    const merged = mergeLines(input);
    const products = await tx.product.findMany({ where: { id: { in: merged.map((l) => l.productId) } } });
    const byId = new Map(products.map((p) => [p.id, p]));
    const stockWarnings: StockWarning[] = [];
    const lines: PricedLine[] = merged.map(({ productId, quantity }) => {
      const p = byId.get(productId);
      if (!p) throw new NotFoundException(`Product ${productId} not found`);
      if (!p.isActive) throw new BadRequestException(`Product ${p.sku} is inactive`);
      if (quantity > p.stockQuantity) {
        stockWarnings.push({ productId, sku: p.sku, requested: quantity, available: p.stockQuantity });
      }
      return { productId, quantity, unitPrice: p.sellingPrice };
    });
    return { lines, stockWarnings };
  }
}
