/**
 * Prisma Database Client for TeachAI (Prisma 7 compatible).
 *
 * Provides a resilient singleton PrismaClient when DATABASE_URL is configured.
 * Safely falls back to null or in-memory service when run in offline/demo mode without database credentials.
 */

// Prisma client singleton with connection resilience
let prismaInstance: any = null

export function getPrisma() {
  if (prismaInstance) return prismaInstance

  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl || databaseUrl.trim() === '') {
    return null
  }

  try {
    // Dynamic import to prevent build-time crashes if @prisma/client is ungenerated in demo environments
    const { PrismaClient } = require('@prisma/client')

    const clientOptions: any = {
      log: process.env.NODE_ENV === 'production' ? ['error'] : ['error', 'warn'],
    }

    if (process.env.NODE_ENV === 'production') {
      prismaInstance = new PrismaClient(clientOptions)
    } else {
      const globalForPrisma = global as unknown as { prisma: any }
      if (!globalForPrisma.prisma) {
        globalForPrisma.prisma = new PrismaClient(clientOptions)
      }
      prismaInstance = globalForPrisma.prisma
    }
    return prismaInstance
  } catch (error) {
    console.warn(
      'Prisma client could not be initialized (using in-memory/mock fallback):',
      error instanceof Error ? error.message : String(error),
    )
    return null
  }
}

export const db = getPrisma()
