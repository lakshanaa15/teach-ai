import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth/session'
import { getPrisma } from '@/lib/db/prisma'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession()
    if (!session || session.role !== 'TEACHER') {
      return NextResponse.json({ success: false, error: 'Unauthorized: Teacher access required.' }, { status: 403 })
    }

    const { id: classId } = await params
    const prisma = getPrisma()

    if (!prisma) {
      return NextResponse.json({ success: true, students: [] })
    }

    const enrollments = await prisma.enrollment.findMany({
      where: { classId },
      include: {
        student: {
          include: {
            user: { select: { id: true, name: true, email: true } },
            topicMasteries: true,
            quizSubmissions: { orderBy: { submittedAt: 'desc' } },
            learningGaps: true,
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    })

    const students = enrollments.map((e) => {
      const s = e.student
      return {
        id: s.id,
        userId: s.userId,
        name: s.user.name,
        email: s.user.email,
        grade: s.grade,
        level: s.level,
        overallScore: s.overallScore,
        progress: s.progress,
        status: s.status,
        joinedAt: e.joinedAt,
        topicMastery: s.topicMasteries.map((tm) => ({
          topic: tm.topic,
          mastery: tm.mastery,
        })),
        quizHistory: s.quizSubmissions.map((qs) => ({
          id: qs.id,
          title: `${qs.topic} Formative Check`,
          date: qs.submittedAt.toISOString().split('T')[0],
          score: qs.percentage,
        })),
        diagnosedGaps: s.learningGaps.map((lg) => `${lg.topic}: ${lg.misconception}`),
      }
    })

    return NextResponse.json({ success: true, students })
  } catch (error) {
    console.error('[GET CLASS STUDENTS ERROR]:', error)
    return NextResponse.json({ success: false, error: 'Failed to retrieve enrolled students.' }, { status: 500 })
  }
}
