import { getPrisma } from '@/lib/db/prisma'
import { recommendations as mockRecommendations } from '@/lib/mock-data'
import { generateRecommendations as aiGenerateRecommendations } from '@/lib/ai-service'
import type { Recommendation } from '@/lib/types'

export async function listRecommendationsService(
  studentId?: string,
): Promise<Recommendation[]> {
  const prisma = getPrisma()
  if (prisma && studentId) {
    try {
      const records = await prisma.recommendation.findMany({
        where: { studentId },
        orderBy: { createdAt: 'desc' },
      })
      if (records && records.length > 0) {
        return records.map((r: any) => ({
          id: r.id,
          title: r.title,
          reason: r.reason,
          difficulty: r.difficulty,
          estMinutes: r.estMinutes,
          priority: r.priority,
          actions: r.actions,
          topic: r.topic,
          studentName: 'Alex Rivera',
        }))
      }
    } catch (e) {
      console.warn('Prisma recommendation query fallback:', e)
    }
  }

  return mockRecommendations
}

export async function generateRecommendationsService(
  topic: string,
  weakConcepts: string[],
): Promise<Recommendation[]> {
  return aiGenerateRecommendations(topic, weakConcepts)
}
