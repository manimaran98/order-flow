import { api, createTestApp, prismaOf, TestApp } from './utils/app.js';
import { bearer, setupUsers } from './utils/auth.js';
import { resetDb } from './utils/db.js';
import { createCustomer, createOrder, createProduct } from './utils/fixtures.js';

describe('payments', () => {
  let app: TestApp;
  let t: Awaited<ReturnType<typeof setupUsers>>;
  let orderId: string; // total RM 100.00

  const pay = (body: Record<string, unknown>) =>
    api(app).post('/payments').set(bearer(t.staff)).send({ orderId, method: 'BANK_TRANSFER', ...body });
  const getOrder = async () => (await api(app).get(`/orders/${orderId}`).set(bearer(t.staff)).expect(200)).body;

  beforeAll(async () => {
    app = await createTestApp();
  });
  beforeEach(async () => {
    await resetDb(prismaOf(app));
    t = await setupUsers(app);
    const customer = await createCustomer(app, t.staff);
    const product = await createProduct(app, t.admin, { sellingPrice: 50 });
    orderId = (await createOrder(app, t.staff, { customerId: customer.id, items: [{ productId: product.id, quantity: 2 }] })).id;
  });
  afterAll(async () => {
    await app.close();
  });

  it('records a deposit on a PENDING order as PARTIAL, then PAID', async () => {
    const res = await pay({ amount: 30, reference: 'MBB-123' }).expect(201);
    expect(res.body).toMatchObject({ amount: '30.00', method: 'BANK_TRANSFER', reference: 'MBB-123' });
    expect(await getOrder()).toMatchObject({ paymentStatus: 'PARTIAL', paidAmount: '30.00', outstandingAmount: '70.00' });
    await pay({ amount: 70 }).expect(201);
    const o = await getOrder();
    expect(o).toMatchObject({ paymentStatus: 'PAID', outstandingAmount: '0.00' });
    expect(o.payments).toHaveLength(2);
  });

  it('rejects overpayment with the outstanding amount', async () => {
    await pay({ amount: 60 }).expect(201);
    const res = await pay({ amount: 40.01 }).expect(409);
    expect(res.body.message).toBe('Payment exceeds outstanding amount (RM 40.00)');
    expect((await getOrder()).paidAmount).toBe('60.00');
  });

  it('rejects payments on cancelled orders', async () => {
    await api(app).patch(`/orders/${orderId}/status`).set(bearer(t.staff)).send({ status: 'CANCELLED' }).expect(200);
    const res = await pay({ amount: 10 }).expect(409);
    expect(res.body.message).toBe('Cannot record a payment for a cancelled order');
  });

  it('validates amount, method and paidAt', async () => {
    await pay({ amount: 0 }).expect(400);
    await pay({ amount: -5 }).expect(400);
    await pay({ amount: 10.005 }).expect(400);
    await pay({ amount: 10, method: 'CRYPTO' }).expect(400);
    await pay({ amount: 10, paidAt: new Date(Date.now() + 86_400_000).toISOString() }).expect(400);
    await pay({ amount: 10, paidAt: '2026-01-15T10:00:00+08:00' }).expect(201); // backdating is fine
    await pay({ amount: 10, orderId: '00000000-0000-4000-8000-000000000000' }).expect(404);
  });

  it('lists and fetches payments', async () => {
    const p = await pay({ amount: 10, method: 'CASH' }).expect(201);
    const list = await api(app).get(`/payments?orderId=${orderId}`).set(bearer(t.staff)).expect(200);
    expect(list.body.meta.total).toBe(1);
    expect(list.body.data[0].order.orderNumber).toMatch(/^ORD-/);
    await api(app).get(`/payments/${p.body.id}`).set(bearer(t.staff)).expect(200);
    expect((await api(app).get('/payments?method=CARD').set(bearer(t.staff))).body.meta.total).toBe(0);
  });

  it('never lets concurrent payments exceed the total', async () => {
    const results = await Promise.all([pay({ amount: 60 }), pay({ amount: 60 })]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(await getOrder()).toMatchObject({ paidAmount: '60.00', paymentStatus: 'PARTIAL' });
  });
});
