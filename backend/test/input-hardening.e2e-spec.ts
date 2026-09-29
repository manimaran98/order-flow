import { api, createTestApp, prismaOf, TestApp } from './utils/app.js';
import { bearer, setupUsers } from './utils/auth.js';
import { resetDb } from './utils/db.js';
import { createCustomer, createOrder, createProduct } from './utils/fixtures.js';

describe('input hardening (never a 500 for bad input)', () => {
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

  const send = (method: 'post' | 'patch', path: string, body: object) =>
    api(app)[method](path).set(bearer(t.admin)).send(body);

  it('rejects null for fields that cannot be empty', async () => {
    const c = await createCustomer(app, t.admin);
    const p = await createProduct(app, t.admin);
    const o = await createOrder(app, t.admin, { customerId: c.id, items: [{ productId: p.id, quantity: 1 }] });
    const cases: ['post' | 'patch', string, object][] = [
      ['patch', `/products/${p.id}`, { name: null }],
      ['patch', `/products/${p.id}`, { sellingPrice: null }],
      ['patch', `/products/${p.id}`, { isActive: null }],
      ['patch', `/orders/${o.id}`, { discount: null }],
      ['patch', `/orders/${o.id}`, { customerId: null }],
      ['patch', `/customers/${c.id}`, { name: null }],
      ['patch', `/users/${t.staffId}`, { role: null }],
      ['post', '/products', { name: 'X', sku: 'NULL-1', sellingPrice: 1, costPrice: 1, lowStockThreshold: null }],
    ];
    for (const [method, path, body] of cases) {
      const res = await send(method, path, body);
      expect({ path, body, status: res.status }).toEqual({ path, body, status: 400 });
    }
  });

  it('lets null clear optional text fields', async () => {
    const c = await createCustomer(app, t.admin, { email: 'ali@kedai.my' });
    const res = await send('patch', `/customers/${c.id}`, { email: null }).expect(200);
    expect(res.body.email).toBeNull();
  });

  it('rejects numbers the database cannot store', async () => {
    const big = await createProduct(app, t.admin, { sellingPrice: 99_999.99, stockQuantity: 0 });
    const big2 = await createProduct(app, t.admin, { sellingPrice: 99_999.99, stockQuantity: 0 });
    const c = await createCustomer(app, t.admin);
    await send('post', '/products', { name: 'X', sku: 'BIG-1', sellingPrice: 1e10, costPrice: 1 }).expect(400);
    await send('post', '/products', { name: 'X', sku: 'BIG-2', sellingPrice: 1, costPrice: 1, stockQuantity: 3e9 }).expect(400);
    await send('post', '/inventory/adjustments', { productId: big.id, type: 'RESTOCK', quantity: 3e9 }).expect(400);
    await api(app).get('/orders?page=1e20').set(bearer(t.admin)).expect(400);
    await send('post', '/orders', {
      customerId: c.id,
      items: [
        { productId: big.id, quantity: 100_000 },
        { productId: big2.id, quantity: 100_000 },
      ],
    }).expect(400);
  });
});
