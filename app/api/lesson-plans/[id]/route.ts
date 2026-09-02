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
        teacher: { include: { user: { select: { name: true, email: true } } } },
        class: { select: { id: true, name: true, classCode: true } },
      },
    })

    if (!plan) {
      return NextResponse.json({ success: false, error: 'Lesson plan not found.' }, { status: 404 })
    }

    return NextResponse.json({ success: true, lessonPlan: plan })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch lesson plan' },
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
      return NextResponse.json({ success: false, error: 'Unauthorized: Teacher authentication required' }, { status: 401 })
    }

    const { id } = await params
    const prisma = getPrisma()
    if (!prisma) {
      return NextResponse.json({ success: false, error: 'Database unavailable' }, { status: 500 })
    }

    // Verify ownership
    const teacher = await prisma.teacher.findFirst({
      where: { userId: session.userId },
    })

    const existing = await prisma.lessonPlan.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Lesson plan not found.' }, { status: 404 })
    }

    if (existing.teacherId && teacher && existing.teacherId !== teacher.id) {
      return NextResponse.json({ success: false, error: 'Forbidden: You do not own this lesson plan.' }, { status: 403 })
    }

    const body = await req.json()
    const {
      title,
      subject,
      grade,
      topic,
      learningObjective,
      duration,
      curriculum,
      source,
      content,
      classId,
    } = body

    const updated = await prisma.lessonPlan.update({
      where: { id },
      data: {
        ...(title ? { title: title.trim() } : content?.lessonTitle ? { title: content.lessonTitle.trim() } : {}),
        ...(subject ? { subject: subject.trim() } : content?.subject ? { subject: content.subject.trim() } : {}),
        ...(grade ? { grade: grade.trim() } : content?.grade ? { grade: content.grade.trim() } : {}),
        ...(topic ? { topic: topic.trim() } : content?.topic ? { topic: content.topic.trim() } : {}),
        ...(learningObjective
          ? { learningObjective: learningObjective.trim() }
          : Array.isArray(content?.learningObjectives) && content.learningObjectives.length > 0
            ? { learningObjective: content.learningObjectives.join('\n') }
            : {}),
        ...(duration ? { duration: duration.trim() } : content?.duration ? { duration: content.duration.trim() } : {}),
        ...(curriculum ? { curriculum: curriculum.trim() } : content?.curriculumAlignment ? { curriculum: content.curriculumAlignment.trim() } : {}),
        ...(source !== undefined ? { source: source?.trim() || null } : {}),
        ...(content ? { content: content as any } : {}),
        ...(classId !== undefined ? { classId: classId || null } : {}),
      },
      include: {
        teacher: { include: { user: { select: { name: true, email: true } } } },
        class: { select: { id: true, name: true, classCode: true } },
      },
    })

    return NextResponse.json({ success: true, lessonPlan: updated })
  } catch (error) {
    console.error('[UPDATE LESSON PLAN ERROR]:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to save lesson plan changes.' },
      { status: 500 },
    )
  }
}

export const PATCH = PUT

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

    await prisma.lessonPlan.delete({
      where: { id },
    })

    return NextResponse.json({ success: true, message: 'Lesson plan deleted.' })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to delete lesson plan.' },
      { status: 500 },
    )
  }
}
