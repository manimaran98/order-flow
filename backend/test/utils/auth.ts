import { api, TestApp } from './app.js';

export const PASSWORD = 'Password123!';
export const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

/** Registers the first ADMIN, creates one STAFF, and returns both tokens. */
export async function setupUsers(app: TestApp) {
  const admin = await api(app)
    .post('/auth/register')
    .send({ name: 'Admin', email: 'admin@test.my', password: PASSWORD })
    .expect(201);
  const staff = await api(app)
    .post('/users')
    .set(bearer(admin.body.accessToken))
    .send({ name: 'Staff', email: 'staff@test.my', password: PASSWORD, role: 'STAFF' })
    .expect(201);
  const staffLogin = await api(app)
    .post('/auth/login')
    .send({ email: 'staff@test.my', password: PASSWORD })
    .expect(200);
  return {
    admin: admin.body.accessToken as string,
    adminId: admin.body.user.id as string,
    staff: staffLogin.body.accessToken as string,
    staffId: staff.body.id as string,
  };
}
