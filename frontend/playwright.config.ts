import { defineConfig, devices } from '@playwright/test';
import { TEST_DB } from './e2e/db';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1, // one shared test database
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 10_000 },
  globalSetup: './e2e/global-setup.ts',
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL: 'http://localhost:3001', trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } },
    { name: 'phone', use: { ...devices['Pixel 7'] } },
  ],
  webServer: [
    {
      command: 'npm run build && node dist/main.js',
      cwd: '../backend',
      url: 'http://localhost:4001/health',
      env: { PORT: '4001', DATABASE_URL: TEST_DB, JWT_SECRET: 'e2e-secret', JWT_EXPIRES_IN: '8h', CORS_ORIGIN: 'http://localhost:3001' },
      reuseExistingServer: false,
      timeout: 180_000,
    },
    {
      command: 'npm run build && npm run start -- --port 3001',
      url: 'http://localhost:3001/login',
      env: { API_URL: 'http://localhost:4001' },
      reuseExistingServer: false,
      timeout: 300_000,
    },
  ],
});
