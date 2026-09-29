import { api, createTestApp, prismaOf, TestApp } from './utils/app.js';
import { resetDb } from './utils/db.js';

describe('database constraints', () => {
  let app: TestApp;
  const prisma = () => prismaOf(app);

  beforeAll(async () => {
    app = await createTestApp();
  });
  beforeEach(async () => {
    await resetDb(prisma());
  });
  afterAll(async () => {
    await app.close();
  });

  async function seedOrder() {
    const user = await prisma().user.create({
      data: { name: 'A', email: 'a@x.my', passwordHash: 'x', role: 'ADMIN' },
    });
    const customer = await prisma().customer.create({ data: { name: 'C' } });
    return prisma().order.create({
      data: {
        orderNumber: 'ORD-TEST-1',
        customerId: customer.id,
        createdById: user.id,
        subtotal: '100.00',
        discount: '0.00',
        total: '100.00',
      },
    });
  }

  it('never allows negative stock', async () => {
    const p = await prisma().product.create({
      data: { name: 'X', sku: 'X1', sellingPrice: '1.00', costPrice: '0.50', stockQuantity: 1 },
    });
    await expect(
      prisma().product.update({ where: { id: p.id }, data: { stockQuantity: -1 } }),
    ).rejects.toThrow(/products_stock_nonneg/);
  });

  it('never allows paid amount above the order total', async () => {
    const order = await seedOrder();
    await expect(
      prisma().order.update({ where: { id: order.id }, data: { paidAmount: '100.01' } }),
    ).rejects.toThrow(/orders_paid_range/);
  });

  it('never allows a discount larger than the subtotal', async () => {
    const order = await seedOrder();
    await expect(
      prisma().order.update({
        where: { id: order.id },
        data: { discount: '150.00', total: '-50.00' },
      }),
    ).rejects.toThrow(/orders_discount_range/);
  });

  it('provides the order number sequence', async () => {
    const [row] = await prisma().$queryRaw<{ n: bigint }[]>`SELECT nextval('order_number_seq') AS n`;
    expect(row.n).toBe(1n);
  });

  it('keeps health working after migrations', async () => {
    await api(app).get('/health').expect(200);
  });
});
