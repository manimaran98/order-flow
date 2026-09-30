import { Client } from 'pg';

export const TEST_DB = 'postgresql://orderflow:orderflow@localhost:5432/orderflow_test';

/** Same guarded wipe as the backend e2e suite: only ever the orderflow_test database. */
export async function resetDb() {
  const client = new Client({ connectionString: TEST_DB });
  await client.connect();
  try {
    const { rows } = await client.query<{ tablename: string }>(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`,
    );
    if (rows.length) await client.query(`TRUNCATE ${rows.map((r) => `"${r.tablename}"`).join(', ')} RESTART IDENTITY CASCADE`);
    await client.query('ALTER SEQUENCE IF EXISTS order_number_seq RESTART WITH 1');
  } finally {
    await client.end();
  }
}
