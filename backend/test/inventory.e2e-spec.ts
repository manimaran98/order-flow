import { api, createTestApp, prismaOf, TestApp } from './utils/app.js';
import { bearer, setupUsers } from './utils/auth.js';
import { resetDb } from './utils/db.js';
import { createProduct } from './utils/fixtures.js';

describe('inventory', () => {
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

  const adjust = (token: string, body: object) =>
    api(app).post('/inventory/adjustments').set(bearer(token)).send(body);

  it('restocks and records the ledger', async () => {
    const p = await createProduct(app, t.admin, { stockQuantity: 10 });
    const res = await adjust(t.admin, { productId: p.id, type: 'RESTOCK', quantity: 5 }).expect(201);
    expect(res.body.product.stockQuantity).toBe(15);
    expect(res.body.transaction).toMatchObject({ type: 'RESTOCK', quantity: 5, referenceType: 'MANUAL' });
  });

  it('requires a note for ADJUSTMENT and a positive RESTOCK', async () => {
    const p = await createProduct(app, t.admin);
    await adjust(t.admin, { productId: p.id, type: 'ADJUSTMENT', quantity: -1 }).expect(400);
    await adjust(t.admin, { productId: p.id, type: 'RESTOCK', quantity: -1 }).expect(400);
    await adjust(t.admin, { productId: p.id, type: 'RESTOCK', quantity: 0 }).expect(400);
  });

  it('refuses a negative adjustment that would go below zero', async () => {
    const p = await createProduct(app, t.admin, { sku: 'MILO-18', stockQuantity: 3 });
    const res = await adjust(t.admin, {
      productId: p.id,
      type: 'ADJUSTMENT',
      quantity: -4,
      note: 'Damaged',
    }).expect(409);
    expect(res.body).toMatchObject({ sku: 'MILO-18', requested: 4, available: 3 });
    const ok = await adjust(t.admin, { productId: p.id, type: 'ADJUSTMENT', quantity: -3, note: 'Damaged' }).expect(201);
    expect(ok.body.product.stockQuantity).toBe(0);
  });

  it('forbids STAFF from adjusting stock and 404s unknown products', async () => {
    const p = await createProduct(app, t.admin);
    await adjust(t.staff, { productId: p.id, type: 'RESTOCK', quantity: 1 }).expect(403);
    await adjust(t.admin, { productId: '00000000-0000-4000-8000-000000000000', type: 'RESTOCK', quantity: 1 }).expect(404);
  });

  it('lists stock with a low-stock flag and a dedicated low-stock view', async () => {
    await createProduct(app, t.admin, { sku: 'OK', stockQuantity: 10, lowStockThreshold: 2 });
    await createProduct(app, t.admin, { sku: 'EDGE', stockQuantity: 2, lowStockThreshold: 2 });
    const all = await api(app).get('/inventory').set(bearer(t.staff)).expect(200);
    const flags = Object.fromEntries(all.body.data.map((p: { sku: string; isLow: boolean }) => [p.sku, p.isLow]));
    expect(flags).toEqual({ OK: false, EDGE: true });
    const low = await api(app).get('/inventory/low-stock').set(bearer(t.staff)).expect(200);
    expect(low.body.map((p: { sku: string }) => p.sku)).toEqual(['EDGE']);
  });

  it('keeps the ledger in sync with stock', async () => {
    const p = await createProduct(app, t.admin, { stockQuantity: 10 });
    await adjust(t.admin, { productId: p.id, type: 'RESTOCK', quantity: 20 }).expect(201);
    await adjust(t.admin, { productId: p.id, type: 'ADJUSTMENT', quantity: -2, note: 'Count' }).expect(201);
    const res = await api(app).get(`/inventory/${p.id}`).set(bearer(t.staff)).expect(200);
    const sum = res.body.transactions.data.reduce((s: number, tx: { quantity: number }) => s + tx.quantity, 0);
    expect(res.body.product.stockQuantity).toBe(28);
    expect(sum).toBe(28);
    expect(res.body.transactions.data[0].type).toBe('ADJUSTMENT'); // newest first
  });
});
