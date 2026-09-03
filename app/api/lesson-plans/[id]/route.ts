import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth/session'
import { getPrisma } from '@/lib/db/prisma'

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

    const plan = await prisma.lessonPlan.findUnique({
      where: { id },
      include: {
        class: { select: { id: true, name: true, classCode: true, subject: true } },
        materials: true,
      },
    })

    if (!plan) {
      return NextResponse.json({ success: false, error: 'Lesson plan not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, lessonPlan: plan })
  } catch (error) {
    console.error('[GET LESSON PLAN DETAIL ERROR]:', error)
    return NextResponse.json({ success: false, error: 'Failed to retrieve lesson plan' }, { status: 500 })
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession()
    if (!session || session.role !== 'TEACHER') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Teacher access required.' },
        { status: 403 },
      )
    }

    const { id } = await params
    const prisma = getPrisma()
    if (!prisma) {
      return NextResponse.json({ success: false, error: 'Database unavailable' }, { status: 500 })
    }

    const body = await req.json()
    const { title, topic, learningObjective, content, subject, grade, duration, curriculum } = body

    const updated = await prisma.lessonPlan.update({
      where: { id },
      data: {
        ...(title ? { title: title.trim() } : {}),
        ...(topic ? { topic: topic.trim() } : {}),
        ...(learningObjective ? { learningObjective: learningObjective.trim() } : {}),
        ...(content ? { content } : {}),
        ...(subject ? { subject: subject.trim() } : {}),
        ...(grade ? { grade: grade.trim() } : {}),
        ...(duration ? { duration: duration.trim() } : {}),
        ...(curriculum ? { curriculum: curriculum.trim() } : {}),
      },
      include: {
        class: { select: { id: true, name: true, classCode: true, subject: true } },
        materials: true,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Lesson plan updated successfully.',
      lessonPlan: updated,
    })
  } catch (error) {
    console.error('[UPDATE LESSON PLAN ERROR]:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update lesson plan',
      },
      { status: 500 },
    )
  }
}
