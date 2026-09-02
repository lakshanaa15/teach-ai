import { NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth/session'

export async function GET() {
  const session = await getServerSession()
  if (!session) {
    return NextResponse.json(
      { success: false, authenticated: false, error: 'Unauthorized' },
      { status: 401 },
    )
  }

  return NextResponse.json({
    success: true,
    authenticated: true,
    user: {
      id: session.userId,
      name: session.name,
      email: session.email,
      role: session.role,
      institutionName: session.institutionName,
      institutionCode: session.institutionCode,
      teacherId: session.teacherId,
      studentId: session.studentId,
      className: session.className,
    },
  })
}
