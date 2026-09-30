import { execSync } from 'node:child_process';
import { TEST_DB } from './db';

export default function globalSetup() {
  execSync('npx prisma migrate deploy', { cwd: '../backend', stdio: 'inherit', env: { ...process.env, DATABASE_URL: TEST_DB } });
}
