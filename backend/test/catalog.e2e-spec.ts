import { api, createTestApp, prismaOf, TestApp } from './utils/app.js';
import { bearer, setupUsers } from './utils/auth.js';
import { resetDb } from './utils/db.js';
import { createProduct } from './utils/fixtures.js';

const CATALOG_KEYS = ['description', 'id', 'inStock', 'name', 'sellingPrice'];

describe('public catalog', () => {
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

  it('lists active products by name without a token, exposing only public fields', async () => {
    await createProduct(app, t.admin, { name: 'Milo 3in1', description: 'Chocolate malt', sellingPrice: 15.9 });
    await createProduct(app, t.admin, { name: 'Coca-Cola 24 x 320ml', sellingPrice: 12.5 });

    const res = await api(app).get('/catalog').expect(200);

    expect(res.body.meta).toEqual({ page: 1, limit: 20, total: 2, totalPages: 1 });
    expect(res.body.data.map((p: { name: string }) => p.name)).toEqual(['Coca-Cola 24 x 320ml', 'Milo 3in1']);
    for (const item of res.body.data) {
      expect(Object.keys(item).sort()).toEqual(CATALOG_KEYS);
      for (const secret of ['costPrice', 'stockQuantity', 'lowStockThreshold', 'sku', 'isActive', 'createdAt', 'updatedAt']) {
        expect(item).not.toHaveProperty(secret);
      }
    }
    expect(res.body.data[1]).toMatchObject({ sellingPrice: '15.90', description: 'Chocolate malt', inStock: true });
  });

  it('hides inactive products from the list and 404s their detail page', async () => {
    const hidden = await createProduct(app, t.admin, { name: 'Discontinued' });
    await createProduct(app, t.admin, { name: 'Still sold' });
    await api(app).delete(`/products/${hidden.id}`).set(bearer(t.admin)).expect(204);

    const list = await api(app).get('/catalog').expect(200);
    expect(list.body.data.map((p: { name: string }) => p.name)).toEqual(['Still sold']);
    await api(app).get(`/catalog/${hidden.id}`).expect(404);
  });

  it('returns one active product with exactly the public fields', async () => {
    const p = await createProduct(app, t.admin, { name: 'Teh Tarik', sellingPrice: 3 });
    const res = await api(app).get(`/catalog/${p.id}`).expect(200);
    expect(res.body).toEqual({ id: p.id, name: 'Teh Tarik', description: null, sellingPrice: '3.00', inStock: true });
  });

  it('404s an unknown id and 400s a malformed one', async () => {
    await api(app).get('/catalog/00000000-0000-4000-8000-000000000000').expect(404);
    await api(app).get('/catalog/not-a-uuid').expect(400);
  });

  it('searches by name only, case-insensitively', async () => {
    await createProduct(app, t.admin, { name: '100Plus 24 x 325ml', sku: 'HP-24' });
    await createProduct(app, t.admin, { name: 'Milo 3in1', sku: 'MILO-18' });
    const byName = await api(app).get('/catalog?search=100plus').expect(200);
    expect(byName.body.data.map((p: { name: string }) => p.name)).toEqual(['100Plus 24 x 325ml']);
    // SKU is not public, so it must not be searchable either.
    const bySku = await api(app).get('/catalog?search=MILO-18').expect(200);
    expect(bySku.body.data).toEqual([]);
  });

  it('paginates like the other list endpoints', async () => {
    for (const name of ['A', 'B', 'C']) await createProduct(app, t.admin, { name });
    const res = await api(app).get('/catalog?page=2&limit=2').expect(200);
    expect(res.body.meta).toEqual({ page: 2, limit: 2, total: 3, totalPages: 2 });
    expect(res.body.data.map((p: { name: string }) => p.name)).toEqual(['C']);
    await api(app).get('/catalog?limit=101').expect(400);
  });

  it('reports inStock from stock quantity', async () => {
    const out = await createProduct(app, t.admin, { name: 'Out', stockQuantity: 0 });
    const inn = await createProduct(app, t.admin, { name: 'In', stockQuantity: 1 });
    const list = await api(app).get('/catalog').expect(200);
    expect(list.body.data).toMatchObject([
      { name: 'In', inStock: true },
      { name: 'Out', inStock: false },
    ]);
    expect((await api(app).get(`/catalog/${out.id}`).expect(200)).body.inStock).toBe(false);
    expect((await api(app).get(`/catalog/${inn.id}`).expect(200)).body.inStock).toBe(true);
  });

  it('rejects unknown query parameters', async () => {
    await api(app).get('/catalog?active=false').expect(400);
  });
});
