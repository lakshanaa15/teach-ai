import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth/session'
import { getPrisma } from '@/lib/db/prisma'
import type { PracticeQuestion } from '@/lib/types'

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
    const topic = body.topic?.trim() || 'General Topic'
    const answers: Record<string, string> = body.answers || {}
    const questions: PracticeQuestion[] = body.questions || []

    if (!questions || questions.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Questions are required for practice evaluation.' },
        { status: 400 },
      )
    }

    // Resolve student
    let studentId = body.studentId?.trim()
    if (!studentId && session.role === 'STUDENT') {
      const currentStudent = await prisma.student.findFirst({
        where: { userId: session.userId },
      })
      studentId = currentStudent?.id
    }

    // 100% Deterministic Answer Evaluation (authoritative rule-based matching)
    let score = 0
    const total = questions.length
    const conceptsMastered: string[] = []
    const conceptsStillWeak: string[] = []

    const results = questions.map((q, idx) => {
      const userAns = answers[q.id] || answers[String(idx)] || ''
      const isCorrect = userAns.trim().toLowerCase() === q.answer.trim().toLowerCase()

      if (isCorrect) {
        score++
        if (!conceptsMastered.includes(q.concept)) conceptsMastered.push(q.concept)
      } else {
        if (!conceptsStillWeak.includes(q.concept)) conceptsStillWeak.push(q.concept)
      }

      return {
        questionId: q.id,
        question: q.question,
        concept: q.concept,
        studentAnswer: userAns,
        correctAnswer: q.answer,
        correct: isCorrect,
        explanation: q.explanation,
        targetedMisconception: q.targetedMisconception,
      }
    })

    const percentage = total > 0 ? Math.round((score / total) * 100) : 0

    // Deterministically update Topic Mastery in PostgreSQL
    if (studentId) {
      try {
        const existingMastery = await prisma.topicMastery.findFirst({
          where: {
            studentId,
            topic: { contains: topic, mode: 'insensitive' },
          },
        })

        const newMasteryScore = existingMastery
          ? Math.min(100, Math.round((existingMastery.mastery + percentage) / 2))
          : percentage

        await prisma.topicMastery.upsert({
          where: {
            studentId_topic: {
              studentId,
              topic,
            },
          },
          update: {
            mastery: newMasteryScore,
          },
          create: {
            studentId,
            topic,
            mastery: newMasteryScore,
          },
        })
      } catch (dbErr) {
        console.warn('[PRACTICE EVALUATION] Topic mastery update warning:', dbErr)
      }
    }

    const summary =
      percentage >= 80
        ? `Outstanding practice session! You answered ${score}/${total} correctly (${percentage}%). You demonstrated strong conceptual mastery.`
        : percentage >= 50
          ? `Solid progress! You scored ${score}/${total} (${percentage}%). Keep practicing to solidify ${conceptsStillWeak.join(', ')}.`
          : `Practice session complete: ${score}/${total} (${percentage}%). Focus on reviewing the step-by-step explanations for ${conceptsStillWeak.join(', ')}.`

    const recommendedNextStep =
      conceptsStillWeak.length > 0
        ? `Generate another targeted practice set focused on ${conceptsStillWeak.join(', ')}.`
        : `Ready for higher complexity! You can advance to the next learning track or take the class quiz.`

    return NextResponse.json({
      success: true,
      score,
      total,
      percentage,
      results,
      conceptsMastered,
      conceptsStillWeak,
      summary,
      recommendedNextStep,
    })
  } catch (error) {
    console.error('[EVALUATE PRACTICE ERROR]:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to evaluate practice session.',
      },
      { status: 500 },
    )
  }
}
