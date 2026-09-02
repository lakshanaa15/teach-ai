import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth/session'
import { getPrisma } from '@/lib/db/prisma'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session || session.role !== 'TEACHER') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const prisma = getPrisma()
    if (!prisma) {
      return NextResponse.json({ success: true, quizzes: [] })
    }

    const teacher = await prisma.teacher.findFirst({
      where: { userId: session.userId },
    })

    if (!teacher) {
      return NextResponse.json({ success: true, quizzes: [] })
    }

    const quizzes = await prisma.quiz.findMany({
      where: { teacherId: teacher.id },
      orderBy: { createdAt: 'desc' },
      include: {
        questions: true,
        class: { select: { id: true, name: true, classCode: true } },
      },
    })

    return NextResponse.json({ success: true, quizzes })
  } catch (error) {
    console.error('[GET QUIZZES ERROR]:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch quizzes.' },
      { status: 500 },
    )
  }
}
