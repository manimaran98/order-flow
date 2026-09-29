import { api, createTestApp, prismaOf, TestApp } from './utils/app.js';
import { bearer, setupUsers } from './utils/auth.js';
import { resetDb } from './utils/db.js';
import { createCustomer, createOrder, createProduct } from './utils/fixtures.js';

describe('order status transitions', () => {
  let app: TestApp;
  let t: Awaited<ReturnType<typeof setupUsers>>;
  let customerId: string;
  let product: { id: string; sku: string };

  const setStatus = (id: string, status: string) =>
    api(app).patch(`/orders/${id}/status`).set(bearer(t.staff)).send({ status });
  const stockOf = async (id: string) => (await prismaOf(app).product.findUniqueOrThrow({ where: { id } })).stockQuantity;
  const ledgerSum = async (productId: string) =>
    (await prismaOf(app).inventoryTransaction.aggregate({ where: { productId }, _sum: { quantity: true } }))._sum
      .quantity;
  const order = (quantity: number) =>
    createOrder(app, t.staff, { customerId, items: [{ productId: product.id, quantity }] });

  beforeAll(async () => {
    app = await createTestApp();
  });
  beforeEach(async () => {
    await resetDb(prismaOf(app));
    t = await setupUsers(app);
    customerId = (await createCustomer(app, t.staff)).id;
    product = await createProduct(app, t.admin, { sku: 'COKE-24', stockQuantity: 10 });
  });
  afterAll(async () => {
    await app.close();
  });

  it('deducts stock and writes SALE rows on confirm', async () => {
    const o = await order(3);
    const res = await setStatus(o.id, 'CONFIRMED').expect(200);
    expect(res.body.status).toBe('CONFIRMED');
    expect(res.body.confirmedAt).toEqual(expect.any(String));
    expect(await stockOf(product.id)).toBe(7);
    const sale = await prismaOf(app).inventoryTransaction.findFirstOrThrow({ where: { type: 'SALE' } });
    expect(sale).toMatchObject({ quantity: -3, referenceType: 'ORDER', referenceId: o.id });
  });

  it('refuses to confirm without enough stock and changes nothing', async () => {
    const o = await order(11);
    const res = await setStatus(o.id, 'CONFIRMED').expect(409);
    expect(res.body).toMatchObject({ sku: 'COKE-24', requested: 11, available: 10 });
    expect((await api(app).get(`/orders/${o.id}`).set(bearer(t.staff))).body.status).toBe('PENDING');
    expect(await stockOf(product.id)).toBe(10);
  });

  it('refuses to confirm twice', async () => {
    const o = await order(1);
    await setStatus(o.id, 'CONFIRMED').expect(200);
    await setStatus(o.id, 'CONFIRMED').expect(409);
    expect(await stockOf(product.id)).toBe(9);
  });

  it('walks the fulfilment path and makes DELIVERED final', async () => {
    const o = await order(1);
    for (const s of ['CONFIRMED', 'PACKING', 'READY', 'DELIVERED']) await setStatus(o.id, s).expect(200);
    const delivered = await api(app).get(`/orders/${o.id}`).set(bearer(t.staff)).expect(200);
    expect(delivered.body.deliveredAt).toEqual(expect.any(String));
    const res = await setStatus(o.id, 'CANCELLED').expect(409);
    expect(res.body.message).toBe('Cannot change status from DELIVERED to CANCELLED');
  });

  it('rejects skipping steps', async () => {
    const o = await order(1);
    const res = await setStatus(o.id, 'READY').expect(409);
    expect(res.body.message).toBe('Cannot change status from PENDING to READY');
  });

  it('restores stock with RETURN rows when a confirmed order is cancelled', async () => {
    const o = await order(4);
    await setStatus(o.id, 'CONFIRMED').expect(200);
    await setStatus(o.id, 'PACKING').expect(200);
    const res = await setStatus(o.id, 'CANCELLED').expect(200);
    expect(res.body.cancelledAt).toEqual(expect.any(String));
    expect(await stockOf(product.id)).toBe(10);
    expect(await prismaOf(app).inventoryTransaction.count({ where: { type: 'RETURN', quantity: 4 } })).toBe(1);
    await setStatus(o.id, 'CANCELLED').expect(409); // cannot restore twice
    expect(await stockOf(product.id)).toBe(10);
  });

  it('cancels a PENDING order without touching stock', async () => {
    const o = await order(4);
    await setStatus(o.id, 'CANCELLED').expect(200);
    expect(await stockOf(product.id)).toBe(10);
    expect(await prismaOf(app).inventoryTransaction.count({ where: { type: { in: ['SALE', 'RETURN'] } } })).toBe(0);
  });

  it('locks a confirmed order against edits and deletion', async () => {
    const o = await order(1);
    await setStatus(o.id, 'CONFIRMED').expect(200);
    await api(app).patch(`/orders/${o.id}`).set(bearer(t.staff)).send({ notes: 'x' }).expect(409);
    await api(app).delete(`/orders/${o.id}`).set(bearer(t.admin)).expect(409);
  });

  it('never oversells when two orders race for the last units', async () => {
    await api(app)
      .post('/inventory/adjustments')
      .set(bearer(t.admin))
      .send({ productId: product.id, type: 'ADJUSTMENT', quantity: -5, note: 'Set to 5' })
      .expect(201);
    const [a, b] = [await order(5), await order(5)];
    const results = await Promise.all([setStatus(a.id, 'CONFIRMED'), setStatus(b.id, 'CONFIRMED')]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    expect(await stockOf(product.id)).toBe(0);
    expect(await prismaOf(app).inventoryTransaction.count({ where: { type: 'SALE' } })).toBe(1);
    expect(await ledgerSum(product.id)).toBe(0);
  });

  it('deducts the items that are current when a confirm waits behind an edit', async () => {
    const o = await order(1);
    let release!: () => void;
    let locked!: () => void;
    const held = new Promise<void>((r) => (release = r));
    const lockTaken = new Promise<void>((r) => (locked = r));
    // Simulate an in-flight edit to A x 7 that holds the order row lock.
    const edit = prismaOf(app).$transaction(
      async (tx) => {
        await tx.order.updateMany({ where: { id: o.id }, data: { subtotal: '87.50', total: '87.50' } });
        await tx.orderItem.updateMany({ where: { orderId: o.id }, data: { quantity: 7, subtotal: '87.50' } });
        locked();
        await held;
      },
      { timeout: 10_000 },
    );
    await lockTaken;
    const confirm = setStatus(o.id, 'CONFIRMED').then((r) => r);
    await new Promise((r) => setTimeout(r, 300)); // confirm is now blocked on the row lock
    release();
    await edit;
    expect((await confirm).status).toBe(200);
    expect(await stockOf(product.id)).toBe(3);
    expect(await ledgerSum(product.id)).toBe(3);
  });

  it('keeps stock consistent when confirm and cancel race on one order', async () => {
    const o = await order(3);
    await Promise.all([setStatus(o.id, 'CONFIRMED'), setStatus(o.id, 'CANCELLED')]);
    const final = (await api(app).get(`/orders/${o.id}`).set(bearer(t.staff))).body.status;
    expect(await stockOf(product.id)).toBe(final === 'CONFIRMED' ? 7 : 10);
    expect(await ledgerSum(product.id)).toBe(await stockOf(product.id));
  });
});
