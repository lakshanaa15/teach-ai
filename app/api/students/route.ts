import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth/session'
import { getPrisma } from '@/lib/db/prisma'

export async function GET(req: NextRequest) {
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
      return NextResponse.json({ success: true, students: [] })
    }

    const classIdParam = req.nextUrl.searchParams.get('classId')

    let teacher = await prisma.teacher.findFirst({
      where: { userId: session.userId },
      include: { classes: { select: { id: true } } },
    })

    const teacherClassIds = teacher?.classes.map((c) => c.id) || []

    let targetClassIds = teacherClassIds
    if (classIdParam && classIdParam !== 'All') {
      targetClassIds = teacherClassIds.includes(classIdParam)
        ? [classIdParam]
        : []
    }

    if (targetClassIds.length === 0 && classIdParam && classIdParam !== 'All') {
      return NextResponse.json({ success: true, students: [] })
    }

    const enrollments = await prisma.enrollment.findMany({
      where: targetClassIds.length > 0 ? { classId: { in: targetClassIds } } : { classId: { in: teacherClassIds } },
      include: {
        student: {
          include: {
            user: { select: { id: true, name: true, email: true } },
            topicMasteries: true,
            quizSubmissions: { orderBy: { submittedAt: 'desc' } },
            learningGaps: true,
          },
        },
        class: { select: { id: true, name: true, classCode: true } },
      },
      orderBy: { joinedAt: 'desc' },
    })

    // Deduplicate students across classes if viewing all classes
    const studentMap = new Map<string, any>()

    enrollments.forEach((e) => {
      const s = e.student
      if (!studentMap.has(s.id)) {
        studentMap.set(s.id, {
          id: s.id,
          name: s.user.name,
          email: s.user.email,
          grade: s.grade,
          level: s.level,
          overallScore: s.overallScore,
          progress: s.progress,
          status: s.status,
          className: e.class.name,
          classCode: e.class.classCode,
          classId: e.class.id,
          weakTopics: s.learningGaps.map((lg) => lg.topic),
          strengths: s.topicMasteries.filter((tm) => tm.mastery >= 80).map((tm) => tm.topic),
          topicMastery: s.topicMasteries.map((tm) => ({
            topic: tm.topic,
            mastery: tm.mastery,
          })),
          quizHistory: s.quizSubmissions.map((qs) => ({
            id: qs.id,
            title: `${qs.topic} Check Quiz`,
            date: qs.submittedAt.toISOString().split('T')[0],
            score: qs.percentage,
          })),
        })
      }
    })

    return NextResponse.json({ success: true, students: Array.from(studentMap.values()) })
  } catch (error) {
    console.error('[GET STUDENTS ERROR]:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch students list' },
      { status: 500 },
    )
  }
}
