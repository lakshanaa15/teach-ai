import { getPrisma } from '@/lib/db/prisma'
import { recommendations as mockRecommendations } from '@/lib/mock-data'
import {
  generateDiagnosticRecommendationsWithGemini,
  DiagnosticEvidenceInput,
} from '@/lib/gemini'
import type { Recommendation, DiagnosticReport } from '@/lib/types'

export async function listRecommendationsService(
  studentId?: string,
): Promise<Recommendation[]> {
  const prisma = getPrisma()
  if (prisma) {
    try {
      const records = await prisma.recommendation.findMany({
        where: studentId ? { studentId } : undefined,
        include: { student: true },
        orderBy: { createdAt: 'desc' },
        take: 20,
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
          studentName: r.student?.name || 'Alex Rivera',
        }))
      }
    } catch (e) {
      console.warn('Prisma recommendation query fallback:', e)
    }
  }

  return mockRecommendations
}

export interface RecommendationGenerationParams {
  topic: string
  studentId?: string
  classId?: string
  weakConcepts?: string[]
  subject?: string
  grade?: string
  learningObjective?: string
  curriculum?: string
}

export async function generateRecommendationsService(
  paramsOrTopic: string | RecommendationGenerationParams,
  legacyWeakConcepts?: string[],
): Promise<{ diagnosticReport: DiagnosticReport; recommendations: Recommendation[] }> {
  const params: RecommendationGenerationParams =
    typeof paramsOrTopic === 'string'
      ? { topic: paramsOrTopic, weakConcepts: legacyWeakConcepts || [] }
      : paramsOrTopic

  const { topic } = params
  const prisma = getPrisma()

  let studentData: any = null
  let masteryScore: number | undefined = undefined
  let recentQuizScores: number[] = []
  let questionResults: {
    question: string
    concept?: string
    correct: boolean
    feedback?: string
  }[] = []
  let identifiedGaps: string[] = params.weakConcepts ? [...params.weakConcepts] : []
  let strongConcepts: string[] = []
  let materialContext: any = undefined
  let lessonContext: any = undefined

  if (prisma) {
    try {
      // 1. Fetch student info
      if (params.studentId) {
        studentData = await prisma.student.findUnique({
          where: { id: params.studentId },
        })
      } else {
        studentData = await prisma.student.findFirst({
          orderBy: { createdAt: 'asc' },
        })
      }

      // 2. Fetch TopicMastery
      if (studentData) {
        const tm = await prisma.topicMastery.findFirst({
          where: {
            studentId: studentData.id,
            topic: { contains: topic, mode: 'insensitive' },
          },
        })
        if (tm) {
          masteryScore = tm.mastery
        }
      }

      // 3. Fetch recent QuizSubmissions
      const submissions = await prisma.quizSubmission.findMany({
        where: {
          ...(studentData ? { studentId: studentData.id } : {}),
          topic: { contains: topic, mode: 'insensitive' },
        },
        include: {
          conceptResults: true,
          quiz: {
            include: {
              questions: true,
            },
          },
        },
        orderBy: { submittedAt: 'desc' },
        take: 3,
      })

      if (submissions && submissions.length > 0) {
        recentQuizScores = submissions.map((s) => s.percentage)
        if (masteryScore === undefined) {
          masteryScore = submissions[0].percentage
        }

        for (const sub of submissions) {
          if (sub.identifiedGaps?.length) {
            sub.identifiedGaps.forEach((g) => {
              if (!identifiedGaps.includes(g)) identifiedGaps.push(g)
            })
          }
          if (sub.conceptResults?.length) {
            for (const cr of sub.conceptResults) {
              if (cr.correct && !strongConcepts.includes(cr.concept)) {
                strongConcepts.push(cr.concept)
              }
              const matchingQuestion = sub.quiz?.questions?.find((q) => q.concept === cr.concept)
              questionResults.push({
                question: matchingQuestion?.question || `Question evaluating ${cr.concept}`,
                concept: cr.concept,
                correct: cr.correct,
                feedback: cr.feedback,
              })
            }
          }
        }
      }

      // 4. Fetch MaterialAnalysis
      const analysisRec = await prisma.materialAnalysis.findFirst({
        where: {
          topic: { contains: topic, mode: 'insensitive' },
        },
        orderBy: { createdAt: 'desc' },
      })

      if (analysisRec) {
        materialContext = {
          coreConcepts: analysisRec.detectedConcepts || [],
          prerequisites: analysisRec.prerequisites || [],
          commonMisconceptions: analysisRec.commonMisconceptions || [],
          learningOutcomes: analysisRec.learningOutcomes || [],
        }
      }

      // 5. Fetch LessonPlan context
      const lp = await prisma.lessonPlan.findFirst({
        where: {
          topic: { contains: topic, mode: 'insensitive' },
        },
        orderBy: { createdAt: 'desc' },
      })
      if (lp) {
        lessonContext = {
          subject: lp.subject,
          grade: lp.grade,
          learningObjective: lp.learningObjective,
          curriculum: lp.curriculum,
        }
      }
    } catch (dbErr) {
      console.warn('[RECOMMENDATION-SERVICE] DB context query error:', dbErr)
    }
  }

  // Structure diagnostic input for Gemini
  const evidenceInput: DiagnosticEvidenceInput = {
    student: {
      id: studentData?.id || params.studentId || 'std-1',
      name: studentData?.name || 'Alex Rivera',
      grade: params.grade || studentData?.grade || lessonContext?.grade || 'Grade 10',
      subject: params.subject || lessonContext?.subject || 'Academic Subject',
      weakTopics: studentData?.weakTopics || [],
    },
    topic,
    learningObjective:
      params.learningObjective ||
      lessonContext?.learningObjective ||
      `Mastery of core principles in ${topic}`,
    curriculum: params.curriculum || lessonContext?.curriculum || 'Standard National Curriculum',
    performance: {
      masteryScore: masteryScore !== undefined ? masteryScore : 50,
      recentQuizScores: recentQuizScores.length > 0 ? recentQuizScores : [50],
      questionResults: questionResults.length > 0 ? questionResults : undefined,
      identifiedGaps: identifiedGaps.length > 0 ? identifiedGaps : undefined,
      strongConcepts: strongConcepts.length > 0 ? strongConcepts : undefined,
      totalQuestions: questionResults.length > 0 ? questionResults.length : undefined,
      correctQuestions: questionResults.filter((q) => q.correct).length,
    },
    materialAnalysisContext: materialContext,
  }

  // Call real Google Gemini AI
  const diagnosticReport = await generateDiagnosticRecommendationsWithGemini(evidenceInput)

  // Map into Recommendation[] for compatibility
  const studentName = studentData?.name || 'Alex Rivera'
  const mappedRecommendations: Recommendation[] = diagnosticReport.recommendations.map(
    (r, idx) => ({
      id: r.id || `rec-diag-${Date.now()}-${idx + 1}`,
      title: `[${r.priority} Priority] ${r.type}: ${r.targetConcept}`,
      reason: r.reason,
      difficulty: r.recommendedTier,
      estMinutes: typeof r.estimatedTime === 'number' ? r.estimatedTime : 15,
      priority: r.priority,
      actions: (r.actions || [r.action, r.suggestedActivity, r.followUpAssessment]).filter(
        (x): x is string => typeof x === 'string' && x.length > 0,
      ),
      studentName,
      topic,
      type: r.type,
      targetConcept: r.targetConcept,
      suggestedActivity: r.suggestedActivity,
      recommendedTier: r.recommendedTier,
      followUpAssessment: r.followUpAssessment,
      likelyCause: diagnosticReport.diagnosedGaps.find((g) => g.concept === r.targetConcept)?.likelyCause,
      evidence: diagnosticReport.diagnosedGaps.find((g) => g.concept === r.targetConcept)?.evidence,
    }),
  )

  // Persist recommendations in PostgreSQL
  if (prisma && studentData?.id) {
    try {
      for (const rec of mappedRecommendations) {
        await prisma.recommendation.create({
          data: {
            studentId: studentData.id,
            title: rec.title,
            reason: rec.reason,
            difficulty: rec.difficulty as any,
            estMinutes: rec.estMinutes,
            priority: rec.priority as any,
            actions: rec.actions,
            topic: rec.topic,
          },
        })
      }
    } catch (saveErr) {
      console.warn('[RECOMMENDATION-SERVICE] Prisma recommendation save warning:', saveErr)
    }
  }

  return {
    diagnosticReport,
    recommendations: mappedRecommendations,
  }
}
