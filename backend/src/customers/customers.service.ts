import { Injectable, NotFoundException } from '@nestjs/common';
import { paginate, PaginationQueryDto, skipTake } from '../common/pagination.js';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateCustomerDto, ListCustomersQuery, UpdateCustomerDto } from './dto/customer.dto.js';

const orderSummarySelect = {
  id: true,
  orderNumber: true,
  status: true,
  paymentStatus: true,
  total: true,
  paidAmount: true,
  createdAt: true,
} satisfies Prisma.OrderSelect;

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(q: ListCustomersQuery) {
    const where: Prisma.CustomerWhereInput = {
      deletedAt: null,
      ...(q.search && {
        OR: [
          { name: { contains: q.search, mode: 'insensitive' } },
          { phone: { contains: q.search } },
          { email: { contains: q.search, mode: 'insensitive' } },
        ],
      }),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.customer.findMany({ where, orderBy: { name: 'asc' }, ...skipTake(q) }),
      this.prisma.customer.count({ where }),
    ]);
    return paginate(data, total, q);
  }

  async findOne(id: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, deletedAt: null },
      include: { orders: { select: orderSummarySelect, orderBy: { createdAt: 'desc' }, take: 20 } },
    });
    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }

  async orders(id: string, q: PaginationQueryDto) {
    await this.ensureExists(id);
    const where = { customerId: id };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({ where, select: orderSummarySelect, orderBy: { createdAt: 'desc' }, ...skipTake(q) }),
      this.prisma.order.count({ where }),
    ]);
    return paginate(data, total, q);
  }

  create(dto: CreateCustomerDto) {
    return this.prisma.customer.create({ data: dto });
  }

  async update(id: string, dto: UpdateCustomerDto) {
    await this.ensureExists(id);
    return this.prisma.customer.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.ensureExists(id);
    await this.prisma.customer.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  /** Throws 404 unless the customer exists and is not soft-deleted. */
  async ensureExists(id: string, tx: Prisma.TransactionClient = this.prisma) {
    if (!(await tx.customer.count({ where: { id, deletedAt: null } }))) {
      throw new NotFoundException('Customer not found');
    }
  }
}
