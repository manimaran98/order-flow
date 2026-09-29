import { api, TestApp } from './app.js';
import { bearer } from './auth.js';

export async function createCustomer(app: TestApp, token: string, body: Record<string, unknown> = {}) {
  const res = await api(app)
    .post('/customers')
    .set(bearer(token))
    .send({ name: 'Kedai Runcit Ali', phone: '+60123456789', ...body })
    .expect(201);
  return res.body;
}
