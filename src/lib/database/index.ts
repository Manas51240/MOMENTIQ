import { PrismaClient } from '@prisma/client';

// ==============================================================================
// MOMENTIQ — Central Database Client Singleton & BigInt Serializer
// Powered by PostgreSQL (Neon Serverless)
// ==============================================================================

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db;
}

/**
 * Recursively converts BigInt fields to Numbers/Strings for safe JSON serialization.
 */
export function serializeBigInts<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }
  if (typeof obj === 'bigint') {
    return Number(obj) as unknown as T;
  }
  if (Array.isArray(obj)) {
    return obj.map(serializeBigInts) as unknown as T;
  }
  if (typeof obj === 'object') {
    const copy = { ...obj } as Record<string, unknown>;
    for (const key of Object.keys(copy)) {
      copy[key] = serializeBigInts(copy[key]);
    }
    return copy as T;
  }
  return obj;
}

export default db;
