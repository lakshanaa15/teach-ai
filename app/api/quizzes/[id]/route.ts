import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth/session'
import { getPrisma } from '@/lib/db/prisma'
import { normalizeQuestionType } from '@/lib/gemini'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const prisma = getPrisma()
    if (!prisma) {
      return NextResponse.json({ success: false, error: 'Database unavailable' }, { status: 500 })
    }

    const quiz = await prisma.quiz.findUnique({
      where: { id },
      include: {
        questions: { orderBy: { id: 'asc' } },
        teacher: { include: { user: { select: { name: true, email: true } } } },
        class: { select: { id: true, name: true, classCode: true } },
      },
    })

    if (!quiz) {
      return NextResponse.json({ success: false, error: 'Quiz not found.' }, { status: 404 })
    }

    return NextResponse.json({ success: true, quiz })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch quiz' },
      { status: 500 },
    )
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession()
    if (!session || session.role !== 'TEACHER') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const prisma = getPrisma()
    if (!prisma) {
      return NextResponse.json({ success: false, error: 'Database unavailable' }, { status: 500 })
    }

    const body = await req.json()
    const { title, questions, classId } = body

    // Transaction to update quiz and replace/update questions
    const updated = await prisma.$transaction(async (tx) => {
      if (questions && Array.isArray(questions)) {
        // Delete previous questions
        await tx.quizQuestion.deleteMany({
          where: { quizId: id },
        })

        // Recreate questions
        await tx.quizQuestion.createMany({
          data: questions.map((q: any) => ({
            quizId: id,
            type: normalizeQuestionType(q.type),
            question: q.question,
            options: q.options || [],
            answer: q.answer,
            explanation: q.explanation || '',
            concept: q.concept || '',
            difficulty: q.difficulty || 'Standard',
            marks: Number(q.marks) || 1,
          })),
        })
      }

      return tx.quiz.update({
        where: { id },
        data: {
          ...(title ? { title } : {}),
          ...(classId !== undefined ? { classId: classId || null } : {}),
        },
        include: {
          questions: true,
          teacher: { include: { user: { select: { name: true, email: true } } } },
          class: { select: { id: true, name: true, classCode: true } },
        },
      })
    })

    return NextResponse.json({ success: true, quiz: updated })
  } catch (error) {
    console.error('[UPDATE QUIZ ERROR]:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to save quiz changes.' },
      { status: 500 },
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession()
    if (!session || session.role !== 'TEACHER') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const prisma = getPrisma()
    if (!prisma) {
      return NextResponse.json({ success: false, error: 'Database unavailable' }, { status: 500 })
    }

    await prisma.quiz.delete({
      where: { id },
    })

    return NextResponse.json({ success: true, message: 'Quiz deleted.' })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to delete quiz.' },
      { status: 500 },
    )
  }
}
