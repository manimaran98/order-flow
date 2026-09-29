import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { OverpaymentException } from '../common/exceptions.js';
import { money } from '../common/money.js';
import { paginate, skipTake } from '../common/pagination.js';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreatePaymentDto, ListPaymentsQuery } from './dto/payment.dto.js';

const CLOCK_SKEW_MS = 60_000;
const orderRef = { select: { id: true, orderNumber: true } } as const;

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(q: ListPaymentsQuery) {
    const where: Prisma.PaymentWhereInput = {
      orderId: q.orderId,
      method: q.method,
      ...((q.from || q.to) && {
        paidAt: { gte: q.from ? new Date(q.from) : undefined, lte: q.to ? new Date(q.to) : undefined },
      }),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.payment.findMany({ where, include: { order: orderRef }, orderBy: { paidAt: 'desc' }, ...skipTake(q) }),
      this.prisma.payment.count({ where }),
    ]);
    return paginate(data, total, q);
  }

  async findOne(id: string) {
    const payment = await this.prisma.payment.findUnique({ where: { id }, include: { order: orderRef } });
    if (!payment) throw new NotFoundException('Payment not found');
    return payment;
  }

  record(dto: CreatePaymentDto, userId: string) {
    const paidAt = dto.paidAt ? new Date(dto.paidAt) : new Date();
    if (paidAt.getTime() > Date.now() + CLOCK_SKEW_MS) throw new BadRequestException('paidAt cannot be in the future');
    const amount = money(dto.amount).toFixed(2);

    return this.prisma.$transaction(async (tx) => {
      // One guarded statement: adds the payment only if the order is live and it fits the outstanding amount.
      const updated = await tx.$executeRaw`
        UPDATE orders
        SET paid_amount = paid_amount + ${amount}::numeric,
            payment_status = (CASE WHEN paid_amount + ${amount}::numeric >= total THEN 'PAID' ELSE 'PARTIAL' END)::"PaymentStatus",
            updated_at = now()
        WHERE id = ${dto.orderId}::uuid
          AND status <> 'CANCELLED'
          AND paid_amount + ${amount}::numeric <= total`;

      if (updated === 0) {
        const order = await tx.order.findUnique({ where: { id: dto.orderId } });
        if (!order) throw new NotFoundException('Order not found');
        if (order.status === 'CANCELLED') throw new ConflictException('Cannot record a payment for a cancelled order');
        throw new OverpaymentException(order.total.sub(order.paidAmount));
      }

      return tx.payment.create({
        data: {
          orderId: dto.orderId,
          amount,
          method: dto.method,
          reference: dto.reference,
          paidAt,
          recordedById: userId,
        },
        include: { order: orderRef },
      });
    });
  }
}
