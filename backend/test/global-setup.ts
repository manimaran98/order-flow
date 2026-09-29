import { execSync } from 'node:child_process';

export default function setup() {
  const url = process.env.DATABASE_URL ?? '';
  if (!url.includes('orderflow_test')) {
    throw new Error(`Refusing to run API tests against a non-test database: ${url}`);
  }
  // Non-destructive: applies pending migrations only. Each test empties tables via resetDb().
  execSync('npx prisma migrate deploy', { stdio: 'inherit' });
}
