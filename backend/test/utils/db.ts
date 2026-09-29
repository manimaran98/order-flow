import { PrismaService } from '../../src/prisma/prisma.service.js';

/** Empties every application table and restarts the order-number sequence. */
export async function resetDb(prisma: PrismaService) {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  if (tables.length) {
    await prisma.$executeRawUnsafe(
      `TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(', ')} RESTART IDENTITY CASCADE`,
    );
  }
  await prisma.$executeRawUnsafe('ALTER SEQUENCE IF EXISTS order_number_seq RESTART WITH 1');
}
