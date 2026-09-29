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

let skuCounter = 0;

export async function createProduct(app: TestApp, adminToken: string, body: Record<string, unknown> = {}) {
  const res = await api(app)
    .post('/products')
    .set(bearer(adminToken))
    .send({
      name: 'Coca-Cola 24 x 320ml',
      sku: `SKU-${++skuCounter}`,
      sellingPrice: 12.5,
      costPrice: 9,
      stockQuantity: 10,
      lowStockThreshold: 2,
      ...body,
    })
    .expect(201);
  return res.body;
}
