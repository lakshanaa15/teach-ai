import { getPrisma } from '@/lib/db/prisma'
import { generateAdaptiveTracksWithGemini } from '@/lib/gemini'
import type { AdaptiveTrack, LearningLevel } from '@/lib/types'

export interface GenerateAdaptiveOptions {
  subject?: string
  grade?: string
  curriculum?: string
  learningObjective?: string
  studentId?: string
  classId?: string
  materialId?: string
}

export async function generateAdaptiveTracksService(
  topic: string,
  options?: GenerateAdaptiveOptions,
): Promise<AdaptiveTrack[]> {
  const prisma = getPrisma()
  let materialAnalysisContext: any = undefined
  let studentPerformanceContext: any = undefined
  let inferredSubject = options?.subject
  let inferredGrade = options?.grade
  let inferredObjective = options?.learningObjective
  let inferredCurriculum = options?.curriculum

  if (prisma) {
    try {
      // 1. Fetch Material Analysis context if available
      const analysis = await prisma.materialAnalysis.findFirst({
        where: options?.materialId ? { materialId: options.materialId } : { topic },
        orderBy: { createdAt: 'desc' },
      })
      if (analysis) {
        if (!inferredSubject && analysis.subject) inferredSubject = analysis.subject
        materialAnalysisContext = {
          coreConcepts: analysis.detectedConcepts || [],
          prerequisites: analysis.prerequisites || [],
          commonMisconceptions: analysis.commonMisconceptions || [],
          learningOutcomes: analysis.learningOutcomes || [],
        }
      }

      // 2. Fetch Lesson Plan context if available
      const lessonPlan = await prisma.lessonPlan.findFirst({
        where: { topic },
        orderBy: { createdAt: 'desc' },
      })
      if (lessonPlan) {
        if (!inferredSubject && lessonPlan.subject) inferredSubject = lessonPlan.subject
        if (!inferredGrade && lessonPlan.grade) inferredGrade = lessonPlan.grade
        if (!inferredObjective && lessonPlan.learningObjective) inferredObjective = lessonPlan.learningObjective
        if (!inferredCurriculum && lessonPlan.curriculum) inferredCurriculum = lessonPlan.curriculum
      }

      // 3. Fetch Student Performance context if a studentId is provided
      if (options?.studentId) {
        const student = await prisma.student.findUnique({
          where: { id: options.studentId },
          include: {
            user: true,
            topicMasteries: { where: { topic } },
            quizSubmissions: {
              where: { topic },
              include: { conceptResults: true },
              orderBy: { submittedAt: 'desc' },
              take: 3,
            },
          },
        })

        if (student) {
          const masteryRec = student.topicMasteries[0]
          const masteryLevel = masteryRec ? masteryRec.mastery : 50
          const weakSet = new Set<string>()
          const strongSet = new Set<string>()

          for (const sub of student.quizSubmissions) {
            for (const gap of sub.identifiedGaps) weakSet.add(gap)
            for (const cr of sub.conceptResults) {
              if (cr.correct) strongSet.add(cr.concept)
              else weakSet.add(cr.concept)
            }
          }

          studentPerformanceContext = {
            studentName: student.user?.name || undefined,
            masteryLevel,
            overallTier: masteryLevel < 60 ? 'Remedial' : masteryLevel >= 85 ? 'Advanced' : 'Standard',
            weakConcepts: Array.from(weakSet),
            strongConcepts: Array.from(strongSet),
            recentQuizScores: student.quizSubmissions.map((s) => s.percentage),
          }
        }
      }
    } catch (dbErr) {
      console.warn('[ADAPTIVE-SERVICE] Database context query warning:', dbErr)
    }
  }

  // 4. Generate real AI 3-tier tracks with Gemini
  const tracks = await generateAdaptiveTracksWithGemini({
    topic,
    subject: inferredSubject || 'General Course',
    grade: inferredGrade || 'Grade 10 / Secondary',
    curriculum: inferredCurriculum || 'Standard National Curriculum',
    learningObjective: inferredObjective || `Mastery and differentiated comprehension of ${topic}`,
    materialAnalysisContext,
    studentPerformanceContext,
  })

  // 5. Persist to database if available
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
            materialId: options?.materialId || undefined,
          },
        })
      }
    } catch (e) {
      console.warn('[ADAPTIVE-SERVICE] Prisma adaptive track save warning:', e)
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
