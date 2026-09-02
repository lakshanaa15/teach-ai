import { NextResponse } from 'next/server'
import { authStore } from '@/lib/db/auth-store'
import { getServerSession } from '@/lib/auth/session'

export async function GET() {
  try {
    const session = await getServerSession()
    if (!session || session.role !== 'STUDENT') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Student access required.' },
        { status: 403 },
      )
    }

    const studentId = session.studentId || 's-1'
    const classes = await authStore.listEnrolledClassesByStudentId(studentId)

    return NextResponse.json({ success: true, classes })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve enrolled classes.' },
      { status: 500 },
    )
  }
}
