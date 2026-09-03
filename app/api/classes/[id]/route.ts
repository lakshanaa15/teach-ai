import { NextRequest, NextResponse } from 'next/server'
import { authStore } from '@/lib/db/auth-store'
import { getServerSession } from '@/lib/auth/session'
import { getPrisma } from '@/lib/db/prisma'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { id: classId } = await params
    const prisma = getPrisma()

    if (prisma) {
      const cls = await prisma.class.findUnique({
        where: { id: classId },
        include: {
          teacher: {
            include: { user: { select: { name: true, email: true } } },
          },
          topics: { orderBy: { order: 'asc' } },
          enrollments: {
            include: {
              student: {
                include: {
                  user: { select: { id: true, name: true, email: true } },
                },
              },
            },
          },
          lessonPlans: {
            orderBy: { createdAt: 'desc' },
          },
          quizzes: {
            orderBy: { createdAt: 'desc' },
          },
          materials: {
            orderBy: { createdAt: 'desc' },
          },
        },
      })

      if (!cls) {
        return NextResponse.json({ success: false, error: 'Class not found' }, { status: 404 })
      }

      return NextResponse.json({
        success: true,
        class: {
          ...cls,
          studentCount: cls.enrollments.length,
          enrolledStudents: cls.enrollments.map((e) => ({
            id: e.student.id,
            name: e.student.user.name,
            email: e.student.user.email,
            joinedAt: e.joinedAt,
            grade: e.student.grade,
            level: e.student.level,
            overallScore: e.student.overallScore,
          })),
        },
      })
    }

    // In-memory fallback
    const topics = await authStore.listClassTopics(classId)
    return NextResponse.json({
      success: true,
      class: {
        id: classId,
        topics,
      },
    })
  } catch (error) {
    console.error('[GET CLASS DETAIL ERROR]:', error)
    return NextResponse.json({ success: false, error: 'Failed to retrieve class details.' }, { status: 500 })
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession()
    if (!session || session.role !== 'TEACHER') {
      return NextResponse.json({ success: false, error: 'Unauthorized: Teacher access required.' }, { status: 403 })
    }

    const { id: classId } = await params
    const body = await req.json()

    const updated = await authStore.updateClass(classId, {
      name: body.name,
      subject: body.subject,
      subjectCode: body.subjectCode,
      academicYear: body.academicYear,
      department: body.department,
      section: body.section,
      description: body.description,
    })

    if (!updated) {
      return NextResponse.json({ success: false, error: 'Class not found or update failed.' }, { status: 404 })
    }

    return NextResponse.json({ success: true, class: updated })
  } catch (error) {
    console.error('[UPDATE CLASS ERROR]:', error)
    return NextResponse.json({ success: false, error: 'Failed to update class.' }, { status: 500 })
  }
}

export async function DELETE(
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
    let teacherId = session.teacherId

    if (prisma && (!teacherId || teacherId === 't-1')) {
      const teacher = await prisma.teacher.findFirst({
        where: { userId: session.userId },
      })
      if (teacher) teacherId = teacher.id
    }

    if (!teacherId) teacherId = 't-1'

    const success = await authStore.deleteClass(classId, teacherId)

    return NextResponse.json({ success, message: 'Class deleted successfully.' })
  } catch (error) {
    console.error('[DELETE CLASS ERROR]:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete class.' }, { status: 500 })
  }
}
