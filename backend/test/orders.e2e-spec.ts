import { api, createTestApp, prismaOf, TestApp } from './utils/app.js';
import { bearer, setupUsers } from './utils/auth.js';
import { resetDb } from './utils/db.js';
import { createCustomer, createOrder, createProduct } from './utils/fixtures.js';

describe('orders', () => {
  let app: TestApp;
  let t: Awaited<ReturnType<typeof setupUsers>>;
  let customer: { id: string };
  let coke: { id: string; sku: string };
  let milo: { id: string; sku: string };

  beforeAll(async () => {
    app = await createTestApp();
  });
  beforeEach(async () => {
    await resetDb(prismaOf(app));
    t = await setupUsers(app);
    customer = await createCustomer(app, t.staff);
    coke = await createProduct(app, t.admin, { sellingPrice: 12.5, stockQuantity: 10 });
    milo = await createProduct(app, t.admin, { sellingPrice: 3.1, stockQuantity: 1 });
  });
  afterAll(async () => {
    await app.close();
  });

  it('creates a PENDING order with exact totals and a sequential number', async () => {
    const order = await createOrder(app, t.staff, {
      customerId: customer.id,
      items: [
        { productId: coke.id, quantity: 2 },
        { productId: milo.id, quantity: 1 },
      ],
      discount: 3.1,
    });
    expect(order).toMatchObject({
      status: 'PENDING',
      paymentStatus: 'UNPAID',
      subtotal: '28.10',
      discount: '3.10',
      total: '25.00',
      paidAmount: '0.00',
      outstandingAmount: '25.00',
      stockWarnings: [],
    });
    expect(order.orderNumber).toMatch(/^ORD-\d{8}-0001$/);
    expect(order.items).toHaveLength(2);
  });

  it('merges duplicate product lines into one item', async () => {
    const order = await createOrder(app, t.staff, {
      customerId: customer.id,
      items: [
        { productId: coke.id, quantity: 1 },
        { productId: coke.id, quantity: 2 },
      ],
    });
    expect(order.items).toHaveLength(1);
    expect(order.items[0]).toMatchObject({ quantity: 3, subtotal: '37.50' });
  });

  it('warns about low stock but still takes the order', async () => {
    const order = await createOrder(app, t.staff, {
      customerId: customer.id,
      items: [{ productId: milo.id, quantity: 5 }],
    });
    expect(order.stockWarnings).toEqual([{ productId: milo.id, sku: milo.sku, requested: 5, available: 1 }]);
  });

  it('rejects bad input', async () => {
    const post = (body: object) => api(app).post('/orders').set(bearer(t.staff)).send(body);
    await post({ customerId: customer.id, items: [] }).expect(400);
    await post({ customerId: customer.id, items: [{ productId: coke.id, quantity: 0 }] }).expect(400);
    await post({ customerId: customer.id, items: [{ productId: coke.id, quantity: 1 }], discount: 12.51 }).expect(400);
    await post({ customerId: customer.id, items: [{ productId: coke.id, quantity: 1 }], discount: 1.005 }).expect(400);
    await post({ customerId: '00000000-0000-4000-8000-000000000000', items: [{ productId: coke.id, quantity: 1 }] }).expect(404);
    await api(app).delete(`/products/${coke.id}`).set(bearer(t.admin)).expect(204);
    await post({ customerId: customer.id, items: [{ productId: coke.id, quantity: 1 }] }).expect(400);
  });

  it('snapshots the unit price at order time', async () => {
    const order = await createOrder(app, t.staff, { customerId: customer.id, items: [{ productId: coke.id, quantity: 1 }] });
    await api(app).patch(`/products/${coke.id}`).set(bearer(t.admin)).send({ sellingPrice: 99 }).expect(200);
    const got = await api(app).get(`/orders/${order.id}`).set(bearer(t.staff)).expect(200);
    expect(got.body.items[0].unitPrice).toBe('12.50');
  });

  it('edits a PENDING order and recomputes totals', async () => {
    const order = await createOrder(app, t.staff, { customerId: customer.id, items: [{ productId: coke.id, quantity: 1 }] });
    const res = await api(app)
      .patch(`/orders/${order.id}`)
      .set(bearer(t.staff))
      .send({ items: [{ productId: coke.id, quantity: 4 }], discount: 10, notes: 'Deliver Friday' })
      .expect(200);
    expect(res.body).toMatchObject({ subtotal: '50.00', total: '40.00', notes: 'Deliver Friday' });
    expect(res.body.items).toHaveLength(1);
    const discountOnly = await api(app).patch(`/orders/${order.id}`).set(bearer(t.staff)).send({ discount: 0 }).expect(200);
    expect(discountOnly.body.total).toBe('50.00');
  });

  it('lists with filters, search and pagination', async () => {
    const other = await createCustomer(app, t.staff, { name: 'Syarikat Tan Bros' });
    await createOrder(app, t.staff, { customerId: customer.id, items: [{ productId: coke.id, quantity: 1 }] });
    await createOrder(app, t.staff, { customerId: other.id, items: [{ productId: coke.id, quantity: 1 }] });
    const list = (qs: string) => api(app).get(`/orders${qs}`).set(bearer(t.staff)).expect(200);
    expect((await list('?status=PENDING')).body.meta.total).toBe(2);
    expect((await list('?search=tan bros')).body.data[0].customer.name).toBe('Syarikat Tan Bros');
    expect((await list('?search=-0002')).body.meta.total).toBe(1);
    expect((await list(`?customerId=${customer.id}`)).body.meta.total).toBe(1);
    expect((await list('?paymentStatus=PAID')).body.meta.total).toBe(0);
    expect((await list('?limit=1&page=2')).body.meta).toEqual({ page: 2, limit: 1, total: 2, totalPages: 2 });
  });

  it('rejects out-of-range pagination and malformed ids', async () => {
    for (const qs of ['?limit=0', '?limit=101', '?page=0', '?status=SHIPPED']) {
      await api(app).get(`/orders${qs}`).set(bearer(t.staff)).expect(400);
    }
    await api(app).get('/orders/123').set(bearer(t.staff)).expect(400);
    await api(app).get('/orders/00000000-0000-4000-8000-000000000000').set(bearer(t.staff)).expect(404);
  });

  it('lets only ADMIN delete a PENDING order', async () => {
    const order = await createOrder(app, t.staff, { customerId: customer.id, items: [{ productId: coke.id, quantity: 1 }] });
    await api(app).delete(`/orders/${order.id}`).set(bearer(t.staff)).expect(403);
    await api(app).delete(`/orders/${order.id}`).set(bearer(t.admin)).expect(204);
    await api(app).get(`/orders/${order.id}`).set(bearer(t.staff)).expect(404);
  });

  it('shows the order in the customer history', async () => {
    await createOrder(app, t.staff, { customerId: customer.id, items: [{ productId: coke.id, quantity: 1 }] });
    const res = await api(app).get(`/customers/${customer.id}`).set(bearer(t.staff)).expect(200);
    expect(res.body.orders).toHaveLength(1);
  });
});
