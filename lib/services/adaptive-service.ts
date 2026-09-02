import { getPrisma } from '@/lib/db/prisma'
import { generateAdaptiveTracks as aiGenerateTracks } from '@/lib/ai-service'
import type { AdaptiveTrack, LearningLevel } from '@/lib/types'

export async function generateAdaptiveTracksService(
  topic: string,
): Promise<AdaptiveTrack[]> {
  const tracks = await aiGenerateTracks(topic)

  const prisma = getPrisma()
  if (prisma) {
    try {
      for (const track of tracks) {
        await prisma.adaptiveTrack.create({
          data: {
            topic,
            level: track.level as any,
            summary: track.summary,
            points: track.points,
            example: track.example,
            practice: track.practice,
            isApproved: false,
          },
        })
      }
    } catch (e) {
      console.warn('Prisma adaptive track save failed:', e)
    }
  }

  return tracks
}

export async function approveAdaptiveTrackService(
  topic: string,
  level?: LearningLevel,
): Promise<{ success: boolean; topic: string }> {
  const prisma = getPrisma()
  if (prisma) {
    try {
      await prisma.adaptiveTrack.updateMany({
        where: {
          topic,
          ...(level ? { level: level as any } : {}),
        },
        data: { isApproved: true },
      })
    } catch (e) {
      console.warn('Prisma track approval update failed:', e)
    }
  }

  return { success: true, topic }
}
