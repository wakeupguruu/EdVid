/**
 * Prisma Client Singleton
 * Ensures only one database connection pool is used across the entire app
 * This prevents connection exhaustion errors
 */

import { PrismaClient } from '@/db/generated/prisma';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
