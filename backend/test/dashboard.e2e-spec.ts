import { api, createTestApp, prismaOf, TestApp } from './utils/app.js';
import { bearer, setupUsers } from './utils/auth.js';
import { resetDb } from './utils/db.js';
import { createCustomer, createOrder, createProduct } from './utils/fixtures.js';

describe('GET /dashboard/summary', () => {
  let app: TestApp;
  let t: Awaited<ReturnType<typeof setupUsers>>;

  beforeAll(async () => {
    app = await createTestApp();
  });
  beforeEach(async () => {
    await resetDb(prismaOf(app));
    t = await setupUsers(app);
  });
  afterAll(async () => {
    await app.close();
  });

  it('summarises what needs attention', async () => {
    const customerId = (await createCustomer(app, t.staff)).id;
    const a = await createProduct(app, t.admin, { sellingPrice: 12.5, stockQuantity: 20, lowStockThreshold: 2 });
    await createProduct(app, t.admin, { stockQuantity: 1, lowStockThreshold: 5 }); // low
    await createProduct(app, t.admin, { stockQuantity: 0, lowStockThreshold: 5 }).then((p) =>
      api(app).delete(`/products/${p.id}`).set(bearer(t.admin)).expect(204),
    ); // low but inactive, so not counted

    const newOrder = () => createOrder(app, t.staff, { customerId, items: [{ productId: a.id, quantity: 2 }] }); // RM 25.00
    const move = (id: string, ...statuses: string[]) =>
      statuses.reduce(
        (p, status) => p.then(() => api(app).patch(`/orders/${id}/status`).set(bearer(t.staff)).send({ status }).expect(200)),
        Promise.resolve() as Promise<unknown>,
      );
    const pay = (orderId: string, amount: number) =>
      api(app).post('/payments').set(bearer(t.staff)).send({ orderId, amount, method: 'CASH' }).expect(201);

    await newOrder(); // o1: PENDING, unpaid
    const o2 = await newOrder(); // o2: delivered, paid
    await move(o2.id, 'CONFIRMED', 'PACKING', 'READY', 'DELIVERED');
    await pay(o2.id, 25);
    const o3 = await newOrder(); // o3: confirmed, partially paid
    await move(o3.id, 'CONFIRMED');
    await pay(o3.id, 10);
    const o4 = await newOrder(); // o4: cancelled, ignored everywhere
    await move(o4.id, 'CANCELLED');
    const o5 = await newOrder(); // o5: yesterday, PENDING, unpaid
    await prismaOf(app).order.update({
      where: { id: o5.id },
      data: { createdAt: new Date(Date.now() - 2 * 86_400_000) },
    });

    const res = await api(app).get('/dashboard/summary').set(bearer(t.staff)).expect(200);
    expect(res.body).toEqual({
      todayOrders: 3,
      todaySales: '75.00',
      unpaidOrders: 3,
      outstandingAmount: '65.00',
      pendingOrders: 2,
      awaitingFulfilment: 1,
      lowStockProducts: 1,
      completedOrders: 1,
    });
  });

  it('returns zeros on an empty database', async () => {
    const res = await api(app).get('/dashboard/summary').set(bearer(t.staff)).expect(200);
    expect(res.body).toMatchObject({ todayOrders: 0, todaySales: '0.00', outstandingAmount: '0.00' });
  });
});
