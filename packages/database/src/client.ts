import { PrismaClient } from './generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
export function assertPromptStoragePolicy() {
  if (
    process.env.NODE_ENV === 'production' &&
    process.env.NEXT_PHASE !== 'phase-production-build' &&
    process.env.PROMPT_STORAGE_MODE !== 'ENCRYPTED'
  ) {
    throw new Error(
      'Production requires PROMPT_STORAGE_MODE=ENCRYPTED; plaintext prompt storage is disabled.',
    );
  }
}
assertPromptStoragePolicy();
export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? '' }),
    log: [{ emit: 'event', level: 'error' }],
  });
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;

export async function databaseHealth() {
  try {
    await db.$queryRaw`SELECT 1`;
    return { status: 'ok' as const };
  } catch {
    return { status: 'unavailable' as const };
  }
}
