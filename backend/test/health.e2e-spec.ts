import { api, createTestApp, TestApp } from './utils/app.js';

describe('GET /health', () => {
  let app: TestApp;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns ok when the database is reachable', async () => {
    await api(app).get('/health').expect(200).expect({ status: 'ok' });
  });
});
