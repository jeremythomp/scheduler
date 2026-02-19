import { PrismaClient } from '@prisma/client'

const globalForPrisma = global as unknown as { prisma: PrismaClient }

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development'
      ? ['query', 'warn', 'error']
      : ['warn', 'error'],
    // Connection pool is configured via the DATABASE_URL connection string.
    // For a standalone Docker deployment append ?connection_limit=10&pool_timeout=20
    // to DATABASE_URL in .env if you need to tune it. The Prisma default (5) is
    // usually sufficient; raise it only if you see "All connection pool slots
    // are in use" warnings in the logs.
  })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
