import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth/session'
import { getPrisma } from '@/lib/db/prisma'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session || session.role !== 'STUDENT') {
      return NextResponse.json({ success: false, error: 'Unauthorized: Student session required' }, { status: 401 })
    }

    const prisma = getPrisma()
    if (!prisma) {
      return NextResponse.json({ success: true, quizzes: [] })
    }

    // Resolve student record
    let student = await prisma.student.findFirst({
      where: { userId: session.userId },
      include: {
        enrollments: {
          select: { classId: true },
        },
      },
    })

    if (!student) {
      return NextResponse.json({ success: true, quizzes: [] })
    }

    const enrolledClassIds = student.enrollments.map((e) => e.classId)

    // Find ONLY Approved quizzes belonging to classes where student is enrolled
    // (Or institution-wide approved quizzes with no classId if classId is null)
    const quizzes = await prisma.quiz.findMany({
      where: {
        status: 'Approved',
        OR: [
          { classId: { in: enrolledClassIds } },
          ...(enrolledClassIds.length === 0 ? [] : [{ classId: null }]),
        ],
      },
      orderBy: { createdAt: 'desc' },
      include: {
        teacher: {
          include: {
            user: { select: { name: true } },
          },
        },
        class: {
          select: { id: true, name: true, classCode: true },
        },
        questions: {
          select: {
            id: true,
            type: true,
            question: true,
            options: true,
            concept: true,
            difficulty: true,
            marks: true,
            // CRITICAL: answer and explanation are omitted for student privacy & assessment integrity!
          },
        },
        submissions: {
          where: { studentId: student.id },
          select: {
            id: true,
            score: true,
            total: true,
            percentage: true,
            submittedAt: true,
          },
        },
      },
    })

    // Format output
    const formatted = quizzes.map((q) => ({
      id: q.id,
      title: q.title,
      subject: q.subject || 'General',
      grade: q.grade || 'Grade 10',
      topic: q.topic,
      duration: q.duration || '15 mins',
      difficulty: q.difficulty,
      questionCount: q.questions.length,
      teacherName: q.teacher?.user?.name || 'Class Teacher',
      className: q.class?.name || 'General Curriculum',
      classCode: q.class?.classCode || '',
      isCompleted: q.submissions.length > 0,
      latestScore: q.submissions[0]?.percentage || null,
      questions: q.questions,
    }))

    return NextResponse.json({ success: true, quizzes: formatted })
  } catch (error) {
    console.error('[GET ENROLLED QUIZZES ERROR]:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch student quizzes.' },
      { status: 500 },
    )
  }
}
