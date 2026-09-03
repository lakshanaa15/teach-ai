import { NextRequest, NextResponse } from 'next/server'
import { authStore } from '@/lib/db/auth-store'
import { getServerSession } from '@/lib/auth/session'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: classId } = await params
    const topics = await authStore.listClassTopics(classId)
    return NextResponse.json({ success: true, topics })
  } catch (error) {
    console.error('[GET CLASS TOPICS ERROR]:', error)
    return NextResponse.json({ success: false, error: 'Failed to retrieve topics.' }, { status: 500 })
  }
}

export async function POST(
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
    const title = body.title?.trim()

    if (!title) {
      return NextResponse.json({ success: false, error: 'Topic title is required.' }, { status: 400 })
    }

    const topic = await authStore.addClassTopic(classId, title, body.order)

    return NextResponse.json({ success: true, topic })
  } catch (error) {
    console.error('[ADD CLASS TOPIC ERROR]:', error)
    return NextResponse.json({ success: false, error: 'Failed to add topic to syllabus.' }, { status: 500 })
  }
}
