import { NextRequest, NextResponse } from 'next/server'
import { authStore } from '@/lib/db/auth-store'
import { getServerSession } from '@/lib/auth/session'

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; topicId: string }> },
) {
  try {
    const session = await getServerSession()
    if (!session || session.role !== 'TEACHER') {
      return NextResponse.json({ success: false, error: 'Unauthorized: Teacher access required.' }, { status: 403 })
    }

    const { topicId } = await params
    const body = await req.json()

    const updated = await authStore.updateClassTopic(topicId, {
      title: body.title,
      order: body.order,
      isActive: body.isActive,
    })

    if (!updated) {
      return NextResponse.json({ success: false, error: 'Topic not found.' }, { status: 404 })
    }

    return NextResponse.json({ success: true, topic: updated })
  } catch (error) {
    console.error('[UPDATE CLASS TOPIC ERROR]:', error)
    return NextResponse.json({ success: false, error: 'Failed to update topic.' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; topicId: string }> },
) {
  try {
    const session = await getServerSession()
    if (!session || session.role !== 'TEACHER') {
      return NextResponse.json({ success: false, error: 'Unauthorized: Teacher access required.' }, { status: 403 })
    }

    const { topicId } = await params
    const success = await authStore.deleteClassTopic(topicId)

    return NextResponse.json({ success, message: 'Topic removed from syllabus.' })
  } catch (error) {
    console.error('[DELETE CLASS TOPIC ERROR]:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete topic.' }, { status: 500 })
  }
}
