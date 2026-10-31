import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';

// ==============================================================================
// MOMENTIQ — Central Database Client Singleton & BigInt Serializer
// Serverless SQLite Provisioning for Vercel / AWS Lambda
// ==============================================================================

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  // If running in Vercel or AWS Lambda, ensure database file is located in writable /tmp
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    const tmpDbPath = path.join('/tmp', 'dev.db');

    if (!fs.existsSync(tmpDbPath)) {
      const searchPaths = [
        path.join(process.cwd(), 'prisma', 'seed.db'),
        path.join(process.cwd(), 'prisma', 'dev.db'),
        path.resolve('/var/task/prisma/seed.db'),
        path.resolve('/var/task/prisma/dev.db'),
        path.resolve(__dirname, '..', '..', 'prisma', 'seed.db'),
        path.resolve(__dirname, '..', '..', '..', 'prisma', 'seed.db'),
      ];

      let copied = false;
      for (const src of searchPaths) {
        if (fs.existsSync(src)) {
          try {
            fs.copyFileSync(src, tmpDbPath);
            copied = true;
            console.log(`[Database] Initialized serverless SQLite in /tmp from ${src}`);
            break;
          } catch (e) {
            console.error(`[Database] Failed copying SQLite from ${src}:`, e);
          }
        }
      }

      if (!copied) {
        console.warn('[Database] Seed SQLite not found in bundle; SQLite will create empty DB in /tmp');
      }
    }

    return new PrismaClient({
      datasources: {
        db: {
          url: `file:${tmpDbPath}`,
        },
      },
      log: ['error'],
    });
  }

  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

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
