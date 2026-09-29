import { api, createTestApp, prismaOf, TestApp } from './utils/app.js';
import { bearer, PASSWORD, setupUsers } from './utils/auth.js';
import { resetDb } from './utils/db.js';

describe('users', () => {
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

  it('lets an ADMIN list users without password hashes', async () => {
    const res = await api(app).get('/users').set(bearer(t.admin)).expect(200);
    expect(res.body.meta.total).toBe(2);
    expect(res.body.data.every((u: Record<string, unknown>) => !('passwordHash' in u))).toBe(true);
  });

  it('forbids STAFF from user management', async () => {
    await api(app).get('/users').set(bearer(t.staff)).expect(403);
    await api(app)
      .post('/users')
      .set(bearer(t.staff))
      .send({ name: 'X', email: 'x@test.my', password: PASSWORD, role: 'STAFF' })
      .expect(403);
  });

  it('rejects a duplicate email regardless of case', async () => {
    const res = await api(app)
      .post('/users')
      .set(bearer(t.admin))
      .send({ name: 'Dup', email: 'STAFF@test.my', password: PASSWORD, role: 'STAFF' })
      .expect(409);
    expect(res.body.message).toBe('Email already registered');
  });

  it('locks out a deactivated user immediately', async () => {
    await api(app).patch(`/users/${t.staffId}`).set(bearer(t.admin)).send({ isActive: false }).expect(200);
    await api(app).get('/auth/me').set(bearer(t.staff)).expect(401);
    await api(app).post('/auth/login').send({ email: 'staff@test.my', password: PASSWORD }).expect(401);
  });

  it('stops an admin from demoting or deactivating themselves', async () => {
    await api(app).patch(`/users/${t.adminId}`).set(bearer(t.admin)).send({ role: 'STAFF' }).expect(400);
    await api(app).patch(`/users/${t.adminId}`).set(bearer(t.admin)).send({ isActive: false }).expect(400);
  });

  it('lets an admin reset a password', async () => {
    await api(app)
      .patch(`/users/${t.staffId}`)
      .set(bearer(t.admin))
      .send({ password: 'NewPassword456!' })
      .expect(200);
    await api(app).post('/auth/login').send({ email: 'staff@test.my', password: 'NewPassword456!' }).expect(200);
  });

  it('returns 400 for a malformed id and 404 for an unknown one', async () => {
    await api(app).get('/users/not-a-uuid').set(bearer(t.admin)).expect(400);
    await api(app).get('/users/00000000-0000-4000-8000-000000000000').set(bearer(t.admin)).expect(404);
  });
});
