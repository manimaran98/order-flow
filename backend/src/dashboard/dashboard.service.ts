import { Injectable } from '@nestjs/common';
import { money } from '../common/money.js';
import { startOfBusinessDay } from '../common/time.js';
import { PaymentStatus, type Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

const live = { status: { not: 'CANCELLED' } } satisfies Prisma.OrderWhereInput;

// Every payment status except PAID, as `IN (...)` rather than `<> 'PAID'`: same rows, but `<>` cannot
// use an index (it read all orders) while `IN` uses orders_payment_status_idx. docs/perf/query-optimisation.md
const NOT_PAID = Object.values(PaymentStatus).filter((s) => s !== PaymentStatus.PAID);

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(now = new Date()) {
    const [today, unpaid, pendingOrders, awaitingFulfilment, completedOrders, lowStockProducts] = await Promise.all([
      this.prisma.order.aggregate({
        where: { ...live, createdAt: { gte: startOfBusinessDay(now) } },
        _count: true,
        _sum: { total: true },
      }),
      this.prisma.order.aggregate({
        where: { ...live, paymentStatus: { in: NOT_PAID } },
        _count: true,
        _sum: { total: true, paidAmount: true },
      }),
      this.prisma.order.count({ where: { status: 'PENDING' } }),
      this.prisma.order.count({ where: { status: { in: ['CONFIRMED', 'PACKING', 'READY'] } } }),
      this.prisma.order.count({ where: { status: 'DELIVERED' } }),
      this.prisma.product.count({
        where: { isActive: true, stockQuantity: { lte: this.prisma.product.fields.lowStockThreshold } },
      }),
    ]);
    return {
      todayOrders: today._count,
      todaySales: money(today._sum.total ?? 0),
      unpaidOrders: unpaid._count,
      outstandingAmount: money(unpaid._sum.total ?? 0).sub(unpaid._sum.paidAmount ?? 0),
      pendingOrders,
      awaitingFulfilment,
      lowStockProducts,
      completedOrders,
    };
  }
}
