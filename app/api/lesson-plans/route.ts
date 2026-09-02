import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth/session'
import { getPrisma } from '@/lib/db/prisma'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session || session.role !== 'TEACHER') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      )
    }

    const prisma = getPrisma()
    if (!prisma) {
      return NextResponse.json({ success: true, lessonPlans: [] })
    }

    const teacher = await prisma.teacher.findFirst({
      where: { userId: session.userId },
    })

    if (!teacher) {
      return NextResponse.json({ success: true, lessonPlans: [] })
    }

    const lessonPlans = await prisma.lessonPlan.findMany({
      where: { teacherId: teacher.id },
      orderBy: { createdAt: 'desc' },
      include: {
        class: { select: { id: true, name: true, classCode: true } },
      },
    })

    return NextResponse.json({ success: true, lessonPlans })
  } catch (error) {
    console.error('[GET LESSON PLANS ERROR]:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch lesson plans.' },
      { status: 500 },
    )
  }
}
