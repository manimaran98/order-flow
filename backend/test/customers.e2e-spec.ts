import { api, createTestApp, prismaOf, TestApp } from './utils/app.js';
import { bearer, setupUsers } from './utils/auth.js';
import { resetDb } from './utils/db.js';
import { createCustomer } from './utils/fixtures.js';

describe('customers', () => {
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

  it('lets STAFF create, read and update customers', async () => {
    const c = await createCustomer(app, t.staff, { email: 'ali@kedai.my', address: 'Jalan 1, Ipoh' });
    const got = await api(app).get(`/customers/${c.id}`).set(bearer(t.staff)).expect(200);
    expect(got.body).toMatchObject({ name: 'Kedai Runcit Ali', orders: [] });
    const upd = await api(app)
      .patch(`/customers/${c.id}`)
      .set(bearer(t.staff))
      .send({ notes: 'Pays on Fridays' })
      .expect(200);
    expect(upd.body.notes).toBe('Pays on Fridays');
  });

  it('searches by name, phone or email', async () => {
    await createCustomer(app, t.staff, { name: 'Ali', phone: '0123456789' });
    await createCustomer(app, t.staff, { name: 'Mei Ling', phone: '0198887777', email: 'mei@ling.my' });
    const byPhone = await api(app).get('/customers?search=0198').set(bearer(t.staff)).expect(200);
    expect(byPhone.body.data.map((c: { name: string }) => c.name)).toEqual(['Mei Ling']);
    const byEmail = await api(app).get('/customers?search=MEI@').set(bearer(t.staff)).expect(200);
    expect(byEmail.body.meta.total).toBe(1);
  });

  it('soft-deletes (ADMIN only) and hides deleted customers', async () => {
    const c = await createCustomer(app, t.staff);
    await api(app).delete(`/customers/${c.id}`).set(bearer(t.staff)).expect(403);
    await api(app).delete(`/customers/${c.id}`).set(bearer(t.admin)).expect(204);
    await api(app).get(`/customers/${c.id}`).set(bearer(t.staff)).expect(404);
    const list = await api(app).get('/customers').set(bearer(t.staff)).expect(200);
    expect(list.body.meta.total).toBe(0);
    expect(await prismaOf(app).customer.count()).toBe(1); // row still exists
  });

  it('validates input', async () => {
    await api(app).post('/customers').set(bearer(t.staff)).send({ phone: '123456' }).expect(400);
    await api(app).post('/customers').set(bearer(t.staff)).send({ name: 'X', email: 'bad' }).expect(400);
    await api(app).post('/customers').set(bearer(t.staff)).send({ name: 'X', phone: 'call me' }).expect(400);
  });

  it('returns an empty paginated order history', async () => {
    const c = await createCustomer(app, t.staff);
    const res = await api(app).get(`/customers/${c.id}/orders`).set(bearer(t.staff)).expect(200);
    expect(res.body).toEqual({ data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } });
  });
});
