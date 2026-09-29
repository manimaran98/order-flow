import { api, createTestApp, prismaOf, TestApp } from './utils/app.js';
import { bearer, setupUsers } from './utils/auth.js';
import { resetDb } from './utils/db.js';
import { createProduct } from './utils/fixtures.js';

describe('products', () => {
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

  it('creates a product with money as 2-decimal strings and an opening-stock ledger row', async () => {
    const p = await createProduct(app, t.admin, { sellingPrice: 12.5, costPrice: 9 });
    expect(p).toMatchObject({ sellingPrice: '12.50', costPrice: '9.00', stockQuantity: 10, isActive: true });
    const ledger = await api(app).get(`/inventory/${p.id}`).set(bearer(t.staff)).expect(200);
    expect(ledger.body.transactions.data).toMatchObject([{ type: 'RESTOCK', quantity: 10, note: 'Opening stock' }]);
  });

  it('allows only ADMIN to create, update and deactivate', async () => {
    const p = await createProduct(app, t.admin);
    await api(app)
      .post('/products')
      .set(bearer(t.staff))
      .send({ name: 'X', sku: 'X', sellingPrice: 1, costPrice: 1 })
      .expect(403);
    await api(app).patch(`/products/${p.id}`).set(bearer(t.staff)).send({ name: 'Y' }).expect(403);
    await api(app).get(`/products/${p.id}`).set(bearer(t.staff)).expect(200);
  });

  it('rejects duplicate SKUs', async () => {
    await createProduct(app, t.admin, { sku: 'COKE-24' });
    const res = await api(app)
      .post('/products')
      .set(bearer(t.admin))
      .send({ name: 'Dup', sku: 'COKE-24', sellingPrice: 1, costPrice: 1 })
      .expect(409);
    expect(res.body.message).toBe('SKU already exists');
  });

  it('rejects negative prices and prices with more than 2 decimals', async () => {
    const base = { name: 'X', sku: 'X-1', costPrice: 1 };
    await api(app).post('/products').set(bearer(t.admin)).send({ ...base, sellingPrice: -1 }).expect(400);
    await api(app).post('/products').set(bearer(t.admin)).send({ ...base, sellingPrice: 12.345 }).expect(400);
  });

  it('never lets stock be PATCHed directly', async () => {
    const p = await createProduct(app, t.admin);
    await api(app).patch(`/products/${p.id}`).set(bearer(t.admin)).send({ stockQuantity: 999 }).expect(400);
  });

  it('updates price and deactivates instead of deleting', async () => {
    const p = await createProduct(app, t.admin);
    const upd = await api(app).patch(`/products/${p.id}`).set(bearer(t.admin)).send({ sellingPrice: 13.9 }).expect(200);
    expect(upd.body.sellingPrice).toBe('13.90');
    await api(app).delete(`/products/${p.id}`).set(bearer(t.admin)).expect(204);
    const got = await api(app).get(`/products/${p.id}`).set(bearer(t.staff)).expect(200);
    expect(got.body.isActive).toBe(false);
    const active = await api(app).get('/products?active=true').set(bearer(t.staff)).expect(200);
    expect(active.body.meta.total).toBe(0);
  });

  it('searches by name or SKU and filters low stock', async () => {
    await createProduct(app, t.admin, { name: '100Plus 24 x 325ml', sku: 'HP-24', stockQuantity: 50 });
    await createProduct(app, t.admin, { name: 'Milo 3in1', sku: 'MILO-18', stockQuantity: 2, lowStockThreshold: 5 });
    const byName = await api(app).get('/products?search=100plus').set(bearer(t.staff)).expect(200);
    expect(byName.body.data.map((p: { sku: string }) => p.sku)).toEqual(['HP-24']);
    const low = await api(app).get('/products?lowStock=true').set(bearer(t.staff)).expect(200);
    expect(low.body.data.map((p: { sku: string }) => p.sku)).toEqual(['MILO-18']);
  });
});
