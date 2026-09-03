import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth/session'
import { getPrisma } from '@/lib/db/prisma'
import { generateClassroomInsightsWithGemini } from '@/lib/gemini'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session || session.role !== 'TEACHER') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Teacher access required.' },
        { status: 403 },
      )
    }

    const prisma = getPrisma()
    if (!prisma) {
      return NextResponse.json({ success: false, error: 'Database unavailable' }, { status: 500 })
    }

    const body = await req.json()
    const classId = body.classId?.trim()
    const topic = body.topic?.trim() || 'Database Normalization'

    if (!classId) {
      return NextResponse.json({ success: false, error: 'Class ID is required.' }, { status: 400 })
    }

    // Verify teacher profile
    const teacher = await prisma.teacher.findFirst({
      where: {
        OR: [
          { id: session.teacherId || '' },
          { userId: session.userId },
        ],
      },
    })

    // Look up requested class
    const classRecord = await prisma.class.findUnique({
      where: { id: classId },
      include: {
        enrollments: {
          include: {
            student: {
              include: {
                user: { select: { id: true, name: true } },
                topicMasteries: true,
                quizSubmissions: {
                  include: { conceptResults: true },
                  orderBy: { submittedAt: 'desc' },
                },
                learningGaps: true,
              },
            },
          },
        },
      },
    })

    if (!classRecord) {
      return NextResponse.json({ success: false, error: 'Class not found.' }, { status: 404 })
    }

    // Enforce class ownership
    if (teacher && classRecord.teacherId !== teacher.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: You do not have permission to access this class.' },
        { status: 403 },
      )
    }

    const enrolledStudents = classRecord.enrollments.map((e) => e.student)

    // Query material analysis if available
    const materialAnalysis = await prisma.materialAnalysis.findFirst({
      where: {
        topic: { contains: topic, mode: 'insensitive' },
      },
      orderBy: { createdAt: 'desc' },
    })

    // If no students enrolled in DB, fallback to class-wide query or check data sufficiency
    let activeStudents = enrolledStudents
    if (activeStudents.length === 0) {
      // Check if general students exist for the institution
      const allStudents = await prisma.student.findMany({
        take: 30,
        include: {
          user: { select: { id: true, name: true } },
          topicMasteries: true,
          quizSubmissions: {
            include: { conceptResults: true },
            orderBy: { submittedAt: 'desc' },
          },
          learningGaps: true,
        },
      })
      activeStudents = allStudents
    }

    // Check data sufficiency
    const totalStudents = activeStudents.length
    const totalSubmissions = activeStudents.reduce(
      (acc, s) => acc + s.quizSubmissions.length,
      0,
    )

    if (totalStudents === 0 || (totalSubmissions === 0 && !body.forceGenerate)) {
      return NextResponse.json({
        success: false,
        insufficientData: true,
        message:
          'Not enough classroom data to generate reliable insights. Students need to complete assessments or practice activities first.',
      })
    }

    // --- DETERMINISTIC CLASS AGGREGATES ---
    let totalMastery = 0
    let totalScore = 0
    let scoreSubmissionsCount = 0
    let strugglingCount = 0
    let onTrackCount = 0
    let advancedCount = 0

    const conceptStats: Record<string, { correct: number; total: number }> = {}
    const misconceptionCounts: Record<string, { count: number; concept: string }> = {}

    const studentProfiles = activeStudents.map((s) => {
      // Topic mastery for this topic
      const tm = s.topicMasteries.find(
        (m) => m.topic.toLowerCase().includes(topic.toLowerCase()) || topic.toLowerCase().includes(m.topic.toLowerCase()),
      )
      const mastery = tm ? tm.mastery : s.overallScore || 50
      totalMastery += mastery

      if (mastery < 60) strugglingCount++
      else if (mastery >= 80) advancedCount++
      else onTrackCount++

      // Quiz submissions for topic
      const topicSubs = s.quizSubmissions.filter(
        (sub) => sub.topic.toLowerCase().includes(topic.toLowerCase()) || topic.toLowerCase().includes(sub.topic.toLowerCase()),
      )
      const subsToUse = topicSubs.length > 0 ? topicSubs : s.quizSubmissions

      let studentScoreSum = 0
      subsToUse.forEach((sub) => {
        studentScoreSum += sub.percentage
        totalScore += sub.percentage
        scoreSubmissionsCount++

        sub.conceptResults.forEach((cr) => {
          if (!conceptStats[cr.concept]) {
            conceptStats[cr.concept] = { correct: 0, total: 0 }
          }
          conceptStats[cr.concept].total++
          if (cr.correct) conceptStats[cr.concept].correct++
        })

        if (Array.isArray(sub.identifiedGaps)) {
          sub.identifiedGaps.forEach((gap) => {
            if (!misconceptionCounts[gap]) {
              misconceptionCounts[gap] = { count: 0, concept: topic }
            }
            misconceptionCounts[gap].count++
          })
        }
      })

      const quizAverage =
        subsToUse.length > 0 ? Math.round(studentScoreSum / subsToUse.length) : mastery

      const weakConcepts: string[] = []
      const strongConcepts: string[] = []
      const diagnosedGaps: string[] = []

      s.learningGaps.forEach((lg) => {
        if (!weakConcepts.includes(lg.topic)) weakConcepts.push(lg.topic)
        diagnosedGaps.push(`${lg.topic}: ${lg.misconception}`)
        if (!misconceptionCounts[lg.misconception]) {
          misconceptionCounts[lg.misconception] = { count: 0, concept: lg.topic }
        }
        misconceptionCounts[lg.misconception].count++
      })

      return {
        id: s.id,
        name: s.user.name || 'Student',
        tier: s.level,
        topicMastery: mastery,
        quizAverage,
        weakConcepts,
        strongConcepts,
        diagnosedGaps,
      }
    })

    const overallMastery =
      totalStudents > 0 ? Math.round(totalMastery / totalStudents) : 65
    const averageAssessmentScore =
      scoreSubmissionsCount > 0 ? Math.round(totalScore / scoreSubmissionsCount) : overallMastery

    const conceptBreakdown = Object.entries(conceptStats).map(([cName, stats]) => ({
      concept: cName,
      accuracy: Math.round((stats.correct / Math.max(stats.total, 1)) * 100),
      attempts: stats.total,
    }))

    const misconceptionsObserved = Object.entries(misconceptionCounts).map(([misc, info]) => ({
      concept: info.concept,
      misconception: misc,
      affectedStudentsCount: info.count,
    }))

    const insights = await generateClassroomInsightsWithGemini({
      classId: classRecord.id,
      className: classRecord.name,
      topic,
      subject: classRecord.subject || materialAnalysis?.subject || undefined,
      classAggregates: {
        totalStudents,
        overallMastery,
        averageAssessmentScore,
        strugglingCount,
        onTrackCount,
        advancedCount,
        conceptBreakdown,
      },
      studentProfiles,
      misconceptionsObserved,
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
      insights,
    })
  } catch (error) {
    console.error('[CLASSROOM INSIGHTS ERROR]:', error)
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to generate classroom insights.',
      },
      { status: 500 },
    )
  }
}
