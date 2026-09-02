import { NextRequest, NextResponse } from 'next/server'
import { authStore } from '@/lib/db/auth-store'
import { getServerSession } from '@/lib/auth/session'

export async function GET() {
  try {
    const session = await getServerSession()
    if (!session || session.role !== 'TEACHER') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Teacher access required.' },
        { status: 403 },
      )
    }

    const teacherId = session.teacherId || 't-1'
    const classes = await authStore.listClassesByTeacherId(teacherId)

    return NextResponse.json({ success: true, classes })
  } catch (error) {
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

    const body = await req.json()
    const { name, subject, description } = body

    if (!name?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Class name is required.' },
        { status: 400 },
      )
    }

    const teacherId = session.teacherId || 't-1'
    const newClass = await authStore.createClass({
      name: name.trim(),
      subject: subject?.trim() || 'General',
      description: description?.trim(),
      teacherId,
      institutionId: session.institutionId,
    })

    return NextResponse.json({
      success: true,
      message: 'Class created successfully.',
      class: {
        ...newClass,
        studentCount: 0,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to create class.' },
      { status: 500 },
    )
  }
}
