import { NextRequest, NextResponse } from 'next/server'
import { authStore } from '@/lib/db/auth-store'
import { getServerSession } from '@/lib/auth/session'
import { getPrisma } from '@/lib/db/prisma'

export async function GET() {
  try {
    const session = await getServerSession()
    if (!session || session.role !== 'TEACHER') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Teacher access required.' },
        { status: 403 },
      )
    }

    const prisma = getPrisma()
    let teacherId = session.teacherId

    if (prisma && (!teacherId || teacherId === 't-1')) {
      const teacher = await prisma.teacher.findFirst({
        where: { userId: session.userId },
      })
      if (teacher) teacherId = teacher.id
    }

    if (!teacherId) {
      return NextResponse.json({ success: true, classes: [] })
    }

    const classes = await authStore.listClassesByTeacherId(teacherId)

    return NextResponse.json({ success: true, classes })
  } catch (error) {
    console.error('[GET CLASSES ERROR]:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve classes.' },
      { status: 500 },
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session || session.role !== 'TEACHER') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Teacher access required.' },
        { status: 403 },
      )
    }

    const prisma = getPrisma()
    let teacherId = session.teacherId

    if (prisma && (!teacherId || teacherId === 't-1')) {
      let teacher = await prisma.teacher.findFirst({
        where: { userId: session.userId },
      })
      if (!teacher) {
        teacher = await prisma.teacher.create({
          data: {
            userId: session.userId,
            institutionId: session.institutionId,
          },
        })
      }
      teacherId = teacher.id
    }

    if (!teacherId) {
      teacherId = 't-1'
    }

    const body = await req.json()
    const {
      name,
      academicYear,
      department,
      section,
      subject,
      subjectCode,
      classCode,
      description,
      initialTopics,
    } = body

    if (!subject?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Subject is required for the teaching assignment.' },
        { status: 400 },
      )
    }

    const computedName =
      name?.trim() ||
      `${academicYear || 'III Year'} ${department || 'CSE'} ${section || 'A'}`.trim()

    const newClass = await authStore.createClass({
      name: computedName,
      academicYear: academicYear?.trim() || 'III Year',
      department: department?.trim() || 'CSE',
      section: section?.trim() || 'A',
      subject: subject.trim(),
      subjectCode: subjectCode?.trim() || undefined,
      classCode: classCode?.trim() || undefined,
      description: description?.trim() || undefined,
      teacherId,
      institutionId: session.institutionId,
      initialTopics: Array.isArray(initialTopics) ? initialTopics : undefined,
    })

    return NextResponse.json({
      success: true,
      message: 'Class and teaching assignment created successfully.',
      class: {
        ...newClass,
        studentCount: 0,
        lessonsCount: 0,
        quizzesCount: 0,
      },
    })
  } catch (error) {
    console.error('[CREATE CLASS ERROR]:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create class.' },
      { status: 500 },
    )
  }
}
