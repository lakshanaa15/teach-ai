import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth/session'
import { getPrisma } from '@/lib/db/prisma'
import { generatePersonalizedRevisionPlanWithGemini } from '@/lib/gemini'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const prisma = getPrisma()
    if (!prisma) {
      return NextResponse.json({ success: false, error: 'Database unavailable' }, { status: 500 })
    }

    const body = await req.json()
    const topic = body.topic?.trim()

    if (!topic) {
      return NextResponse.json({ success: false, error: 'Topic is required' }, { status: 400 })
    }

    // Resolve student
    let studentId = body.studentId?.trim()
    if (!studentId && session.role === 'STUDENT') {
      const currentStudent = await prisma.student.findFirst({
        where: { userId: session.userId },
      })
      studentId = currentStudent?.id
    }

    if (!studentId) {
      const defaultStudent = await prisma.student.findFirst()
      studentId = defaultStudent?.id
    }

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { user: true },
    })

    if (!student) {
      return NextResponse.json({ success: false, error: 'Student record not found' }, { status: 404 })
    }

    // Query authoritative student performance records from PostgreSQL
    const topicMastery = await prisma.topicMastery.findFirst({
      where: {
        studentId: student.id,
        topic: { contains: topic, mode: 'insensitive' },
      },
    })

    const submissions = await prisma.quizSubmission.findMany({
      where: {
        studentId: student.id,
        topic: { contains: topic, mode: 'insensitive' },
      },
      include: {
        conceptResults: true,
      },
      orderBy: { submittedAt: 'desc' },
      take: 4,
    })

    const learningGapsDb = await prisma.learningGap.findMany({
      where: {
        studentId: student.id,
        topic: { contains: topic, mode: 'insensitive' },
      },
    })

    const materialAnalysis = await prisma.materialAnalysis.findFirst({
      where: {
        topic: { contains: topic, mode: 'insensitive' },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Check for insufficient data
    const hasQuizSubmissions = submissions.length > 0
    const hasLearningGaps = learningGapsDb.length > 0
    const hasMastery = topicMastery !== null && topicMastery.mastery !== 50

    if (!hasQuizSubmissions && !hasLearningGaps && !hasMastery && !body.forceGenerate) {
      return NextResponse.json({
        success: false,
        insufficientData: true,
        message:
          'Not enough learning data to create a personalized revision plan. Complete a diagnostic quiz or practice session first.',
      })
    }

    // Extract weak and strong concepts
    const weakConcepts: string[] = []
    const strongConcepts: string[] = []
    const misconceptions: Array<{ concept: string; misconception: string; correctionStrategy?: string }> = []
    const learningGapsList: Array<{ concept: string; severity?: string; evidence?: string; likelyCause?: string }> = []

    submissions.forEach((sub) => {
      if (Array.isArray(sub.identifiedGaps)) {
        sub.identifiedGaps.forEach((g) => {
          if (!weakConcepts.includes(g)) weakConcepts.push(g)
        })
      }
      sub.conceptResults.forEach((cr) => {
        if (!cr.correct && !weakConcepts.includes(cr.concept)) {
          weakConcepts.push(cr.concept)
          learningGapsList.push({
            concept: cr.concept,
            severity: 'High',
            evidence: cr.feedback,
            likelyCause: 'Difficulty applying conceptual rule.',
          })
        } else if (cr.correct && !strongConcepts.includes(cr.concept)) {
          strongConcepts.push(cr.concept)
        }
      })
    })

    learningGapsDb.forEach((lg) => {
      if (!weakConcepts.includes(lg.topic)) weakConcepts.push(lg.topic)
      misconceptions.push({
        concept: lg.topic,
        misconception: lg.misconception,
        correctionStrategy: lg.action,
      })
    })

    if (materialAnalysis && materialAnalysis.commonMisconceptions) {
      materialAnalysis.commonMisconceptions.forEach((cm) => {
        misconceptions.push({
          concept: topic,
          misconception: cm,
        })
      })
    }

    if (weakConcepts.length === 0) {
      weakConcepts.push(topic)
    }

    const durationDays = typeof body.durationDays === 'number' ? body.durationDays : 7

    const revisionPlan = await generatePersonalizedRevisionPlanWithGemini({
      topic,
      subject: body.subject || materialAnalysis?.subject || undefined,
      grade: body.grade || student.grade || undefined,
      learningObjective: body.learningObjective || undefined,
      student: {
        id: student.id,
        name: student.user.name || 'Student',
        level: student.level,
        masteryScore: topicMastery ? topicMastery.mastery : submissions[0]?.percentage || 50,
      },
      durationDays,
      weakConcepts,
      learningGaps: learningGapsList,
      misconceptions,
      strongConcepts,
      materialAnalysisContext: materialAnalysis
        ? {
            coreConcepts: materialAnalysis.detectedConcepts,
            prerequisites: materialAnalysis.prerequisites,
            commonMisconceptions: materialAnalysis.commonMisconceptions,
            learningOutcomes: materialAnalysis.learningOutcomes,
          }
        : undefined,
    })

    return NextResponse.json({
      success: true,
      revisionPlan,
    })
  } catch (error) {
    console.error('[GENERATE REVISION PLAN ERROR]:', error)
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to generate personalized revision plan.',
      },
      { status: 500 },
    )
  }
}
