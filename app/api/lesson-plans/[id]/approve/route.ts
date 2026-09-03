import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth/session'
import { getPrisma } from '@/lib/db/prisma'

export async function POST(
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

    const updated = await prisma.lessonPlan.update({
      where: { id },
      data: {
        status: 'Approved',
      },
      include: {
        teacher: { include: { user: { select: { name: true, email: true } } } },
        class: { select: { id: true, name: true, classCode: true } },
      },
    })

    // Also approve associated draft quiz for this topic & class
    if (updated.teacherId && updated.classId) {
      await prisma.quiz.updateMany({
        where: {
          teacherId: updated.teacherId,
          classId: updated.classId,
          topic: updated.topic,
          status: 'Draft',
        },
        data: {
          status: 'Approved',
        },
      })
    }

    return NextResponse.json({ success: true, lessonPlan: updated })
  } catch (error) {
    console.error('[APPROVE LESSON PLAN ERROR]:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to approve lesson plan.' },
      { status: 500 },
    )
  }
}
