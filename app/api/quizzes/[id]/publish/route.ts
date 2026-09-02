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

    let classId: string | undefined = undefined
    try {
      const body = await req.json()
      if (body.classId !== undefined) {
        classId = body.classId
      }
    } catch {
      // Body may be empty
    }

    const updated = await prisma.quiz.update({
      where: { id },
      data: {
        status: 'Approved',
        ...(classId !== undefined ? { classId: classId || null } : {}),
      },
      include: {
        questions: true,
        teacher: { include: { user: { select: { name: true, email: true } } } },
        class: { select: { id: true, name: true, classCode: true } },
      },
    })

    return NextResponse.json({ success: true, quiz: updated })
  } catch (error) {
    console.error('[PUBLISH QUIZ ERROR]:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to publish/approve quiz.' },
      { status: 500 },
    )
  }
}
