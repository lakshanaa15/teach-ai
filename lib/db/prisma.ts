/**
 * Prisma Database Client for TeachAI (Prisma 7 compatible).
 *
 * Uses the official @prisma/adapter-pg PostgreSQL driver adapter for direct, high-performance
 * database connectivity with Supabase PostgreSQL.
 * Safely falls back to null when run in offline/demo mode without database credentials.
 */

import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

// Global singleton instance for connection pooling across hot reloads in Next.js
const globalForPrisma = global as unknown as {
  prisma: PrismaClient | null
  pool: Pool | null
}

export function getPrisma(): PrismaClient | null {
  if (globalForPrisma.prisma) {
    return globalForPrisma.prisma
  }

  const databaseUrl = process.env.DATABASE_URL || process.env.DIRECT_URL

  if (!databaseUrl || databaseUrl.trim() === '') {
    return null
  }

  try {
    const pool = globalForPrisma.pool || new Pool({ connectionString: databaseUrl })
    if (process.env.NODE_ENV !== 'production') {
      globalForPrisma.pool = pool
    }

    const adapter = new PrismaPg(pool)
    const client = new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === 'production' ? ['error'] : ['error', 'warn'],
    })

    if (process.env.NODE_ENV !== 'production') {
      globalForPrisma.prisma = client
    }

    return client
  } catch (error) {
    console.error(
      '[PRISMA-INIT-ERROR] Failed to initialize Prisma PostgreSQL client:',
      error instanceof Error ? error.message : String(error),
    )
    throw error
  }
}

export const db = getPrisma()
