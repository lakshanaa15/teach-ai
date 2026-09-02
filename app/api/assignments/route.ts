import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/db/prisma'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const studentId = searchParams.get('studentId')

    const prisma = getPrisma()
    if (prisma && studentId) {
      const assignments = await prisma.assignment.findMany({
        where: { studentId },
        orderBy: { assignedAt: 'desc' },
      })
      return NextResponse.json({ success: true, assignments })
    }

    return NextResponse.json({
      success: true,
      assignments: [
        {
          id: 'asg-1',
          title: 'ER Model — Adaptive Learning Track',
          topic: 'ER Model',
          subject: 'Database Management Systems',
          difficulty: 'Standard',
          status: 'Assigned',
          assignedAt: new Date().toISOString(),
        },
      ],
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch assignments' },
      { status: 500 },
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { title, topic, subject, difficulty, studentId } = body

    const prisma = getPrisma()
    if (prisma) {
      const created = await prisma.assignment.create({
        data: {
          title: title || `${topic} Adaptive Path`,
          topic: topic || 'ER Model',
          subject: subject || 'Computer Science',
          difficulty: difficulty || 'Standard',
          studentId: studentId || undefined,
          status: 'Assigned',
        },
      })
      return NextResponse.json({ success: true, assignment: created })
    }

    return NextResponse.json({
      success: true,
      assignment: {
        id: `asg-${Date.now()}`,
        title: title || `${topic} Adaptive Path`,
        topic: topic || 'ER Model',
        subject: subject || 'Computer Science',
        difficulty: difficulty || 'Standard',
        status: 'Assigned',
        assignedAt: new Date().toISOString(),
      },
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to create assignment' },
      { status: 500 },
    )
  }
}
