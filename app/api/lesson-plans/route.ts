import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth/session'
import { getPrisma } from '@/lib/db/prisma'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const prisma = getPrisma()
    if (!prisma) {
      return NextResponse.json({ success: true, lessonPlans: [] })
    }

    const classIdParam = req.nextUrl.searchParams.get('classId')

    if (session.role === 'TEACHER') {
      let teacher = await prisma.teacher.findFirst({
        where: { userId: session.userId },
      })

      if (!teacher) {
        return NextResponse.json({ success: true, lessonPlans: [] })
      }

      const where: any = { teacherId: teacher.id }
      if (classIdParam && classIdParam !== 'All') {
        where.classId = classIdParam
      }

      const lessonPlans = await prisma.lessonPlan.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          class: { select: { id: true, name: true, classCode: true, subject: true } },
          materials: true,
        },
      })

      return NextResponse.json({ success: true, lessonPlans })
    }

    if (session.role === 'STUDENT') {
      const student = await prisma.student.findFirst({
        where: { userId: session.userId },
        include: { enrollments: { select: { classId: true } } },
      })

      const enrolledClassIds = student?.enrollments.map((e) => e.classId) || []
      if (enrolledClassIds.length === 0) {
        return NextResponse.json({ success: true, lessonPlans: [] })
      }

      const lessonPlans = await prisma.lessonPlan.findMany({
        where: {
          status: 'Approved',
          classId: { in: enrolledClassIds },
        },
        orderBy: { createdAt: 'desc' },
        include: {
          class: { select: { id: true, name: true, classCode: true, subject: true } },
          materials: true,
        },
      })

      return NextResponse.json({ success: true, lessonPlans })
    }

    return NextResponse.json({ success: true, lessonPlans: [] })
  } catch (error) {
    console.error('[GET LESSON PLANS ERROR]:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch lesson plans.' },
      { status: 500 },
    )
  }
}
