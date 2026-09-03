import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth/session'
import { getPrisma } from '@/lib/db/prisma'
import { analyzeQuizPerformanceWithGemini } from '@/lib/gemini'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession()
    if (!session || session.role !== 'STUDENT') {
      return NextResponse.json({ success: false, error: 'Unauthorized: Student required' }, { status: 401 })
    }

    const { id } = await params
    const prisma = getPrisma()
    if (!prisma) {
      return NextResponse.json({ success: false, error: 'Database unavailable' }, { status: 500 })
    }

    const student = await prisma.student.findFirst({
      where: { userId: session.userId },
      include: { user: true },
    })

    if (!student) {
      return NextResponse.json({ success: false, error: 'Student profile not found.' }, { status: 404 })
    }

    const quiz = await prisma.quiz.findUnique({
      where: { id },
      include: {
        questions: { orderBy: { id: 'asc' } },
      },
    })

    if (!quiz) {
      return NextResponse.json({ success: false, error: 'Quiz not found.' }, { status: 404 })
    }

    const body = await req.json()
    const answers: Record<string, string> = body.answers || {}

    // Evaluate answers
    let score = 0
    let totalMarks = 0
    const conceptResults: Array<{
      concept: string
      correct: boolean
      feedback: string
      userAnswer: string
      correctAnswer: string
      questionId: string
      questionText: string
      explanation: string
    }> = []
    const identifiedGaps: string[] = []

    for (let i = 0; i < quiz.questions.length; i++) {
      const q = quiz.questions[i]
      const mark = q.marks || 1
      totalMarks += mark

      // Answer can be keyed by question ID or question index
      const userAns = answers[q.id] || answers[String(i)] || ''
      const isCorrect =
        userAns.trim().toLowerCase() === q.answer.trim().toLowerCase()

      if (isCorrect) {
        score += mark
      } else {
        if (q.concept && !identifiedGaps.includes(q.concept)) {
          identifiedGaps.push(q.concept)
        }
      }

      conceptResults.push({
        concept: q.concept || quiz.topic,
        correct: isCorrect,
        feedback: isCorrect
          ? `Correct! ${q.explanation}`
          : `Needs Review. Correct answer is "${q.answer}". ${q.explanation}`,
        userAnswer: userAns,
        correctAnswer: q.answer,
        questionId: q.id,
        questionText: q.question,
        explanation: q.explanation,
      })
    }

    const percentage = totalMarks > 0 ? Math.round((score / totalMarks) * 100) : 0

    // Save QuizSubmission and ConceptResults in PostgreSQL
    const submission = await prisma.quizSubmission.create({
      data: {
        quizId: quiz.id,
        studentId: student.id,
        topic: quiz.topic,
        score,
        total: totalMarks,
        percentage,
        identifiedGaps,
        conceptResults: {
          create: conceptResults.map((cr) => ({
            concept: cr.concept,
            correct: cr.correct,
            feedback: cr.feedback,
          })),
        },
      },
    })

    // Upsert Topic Mastery in PostgreSQL
    await prisma.topicMastery.upsert({
      where: {
        studentId_topic: {
          studentId: student.id,
          topic: quiz.topic,
        },
      },
      update: {
        mastery: percentage,
      },
      create: {
        studentId: student.id,
        topic: quiz.topic,
        mastery: percentage,
      },
    })

    // Query Material Analysis knowledge graph if available
    let materialAnalysisContext: any = undefined
    try {
      const ma = await prisma.materialAnalysis.findFirst({
        where: { topic: { contains: quiz.topic, mode: 'insensitive' } },
        orderBy: { createdAt: 'desc' },
      })
      if (ma) {
        materialAnalysisContext = {
          coreConcepts: ma.detectedConcepts || [],
          prerequisites: ma.prerequisites || [],
          commonMisconceptions: ma.commonMisconceptions || [],
          learningOutcomes: ma.learningOutcomes || [],
        }
      }
    } catch (maErr) {
      console.warn('[SUBMIT QUIZ] Material Analysis lookup warning:', maErr)
    }

    // Call Gemini for Real AI Learning-Gap Analysis in safe try/catch (deterministic score is preserved)
    let learningAnalysis: any = null
    let aiStatus: 'completed' | 'unavailable' = 'completed'
    let aiMessage: string | undefined = undefined

    try {
      learningAnalysis = await analyzeQuizPerformanceWithGemini({
        quizTitle: quiz.title,
        subject: quiz.subject || undefined,
        grade: quiz.grade || undefined,
        topic: quiz.topic,
        learningObjective: quiz.learningObjective || undefined,
        curriculum: quiz.curriculum || undefined,
        student: { id: student.id, name: student.user?.name || session.email || 'Student' },
        score,
        total: totalMarks,
        percentage,
        questionResults: quiz.questions.map((q, idx) => {
          const cr = conceptResults[idx]
          return {
            question: q.question,
            concept: q.concept || quiz.topic,
            difficulty: q.difficulty || undefined,
            correctAnswer: q.answer,
            studentAnswer: cr?.userAnswer || '',
            correct: cr?.correct || false,
            explanation: q.explanation,
          }
        }),
        materialAnalysisContext,
      })
    } catch (geminiErr) {
      console.error('[SUBMIT QUIZ] Gemini learning analysis warning:', geminiErr)
      aiStatus = 'unavailable'
      aiMessage = 'Quiz submitted successfully. AI learning analysis is temporarily unavailable.'
    }

    return NextResponse.json({
      success: true,
      submission: {
        id: submission.id,
        score,
        total: totalMarks,
        percentage,
        identifiedGaps,
        conceptResults,
        learningAnalysis,
      },
      learningAnalysis,
      aiStatus,
      aiMessage,
    })
  } catch (error) {
    console.error('[SUBMIT QUIZ ERROR]:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to submit and evaluate quiz.' },
      { status: 500 },
    )
  }
}
