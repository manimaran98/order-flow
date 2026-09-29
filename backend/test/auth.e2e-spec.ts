import { api, createTestApp, prismaOf, TestApp } from './utils/app.js';
import { bearer, PASSWORD } from './utils/auth.js';
import { resetDb } from './utils/db.js';

describe('auth', () => {
  let app: TestApp;
  const owner = { name: 'Aisyah', email: 'Aisyah@Shop.my', password: PASSWORD };

  beforeAll(async () => {
    app = await createTestApp();
  });
  beforeEach(async () => {
    await resetDb(prismaOf(app));
  });
  afterAll(async () => {
    await app.close();
  });

  it('makes the first registered user an ADMIN and never returns the hash', async () => {
    const res = await api(app).post('/auth/register').send(owner).expect(201);
    expect(res.body.accessToken).toEqual(expect.any(String));
    expect(res.body.user).toMatchObject({ email: 'aisyah@shop.my', role: 'ADMIN', isActive: true });
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  it('closes registration once any user exists', async () => {
    await api(app).post('/auth/register').send(owner).expect(201);
    await api(app)
      .post('/auth/register')
      .send({ ...owner, email: 'other@shop.my' })
      .expect(403);
  });

  it('logs in regardless of email case and returns the current user', async () => {
    await api(app).post('/auth/register').send(owner).expect(201);
    const login = await api(app)
      .post('/auth/login')
      .send({ email: 'AISYAH@shop.my', password: PASSWORD })
      .expect(200);
    const me = await api(app).get('/auth/me').set(bearer(login.body.accessToken)).expect(200);
    expect(me.body).toMatchObject({ email: 'aisyah@shop.my', role: 'ADMIN' });
  });

  it('rejects a wrong password', async () => {
    await api(app).post('/auth/register').send(owner).expect(201);
    const res = await api(app)
      .post('/auth/login')
      .send({ email: owner.email, password: 'wrong-password' })
      .expect(401);
    expect(res.body.message).toBe('Invalid email or password');
  });

  it('rejects missing and forged tokens', async () => {
    await api(app).get('/auth/me').expect(401);
    await api(app).get('/auth/me').set(bearer('not.a.jwt')).expect(401);
  });

  it('validates the register body', async () => {
    await api(app).post('/auth/register').send({ name: 'X', email: 'nope', password: 'short' }).expect(400);
    await api(app)
      .post('/auth/register')
      .send({ ...owner, role: 'ADMIN' })
      .expect(400); // unknown property rejected
  });

  it('leaves /health public', async () => {
    await api(app).get('/health').expect(200);
  });
});
