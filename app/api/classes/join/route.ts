import { NextRequest, NextResponse } from 'next/server'
import { authStore } from '@/lib/db/auth-store'
import { getServerSession } from '@/lib/auth/session'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session || session.role !== 'STUDENT') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Student access required.' },
        { status: 403 },
      )
    }

    const body = await req.json()
    const { classCode } = body

    if (!classCode?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid class code.' },
        { status: 400 },
      )
    }

    // 1. Find class by code
    const targetClass = await authStore.findClassByCode(classCode)
    if (!targetClass) {
      return NextResponse.json(
        { success: false, error: 'Class not found. Please check the class code.' },
        { status: 404 },
      )
    }

    // 2. Validate Institution match
    if (targetClass.institutionId !== session.institutionId) {
      return NextResponse.json(
        { success: false, error: 'Cannot join a class from another institution.' },
        { status: 403 },
      )
    }

    const studentId = session.studentId || 's-1'

    // 3. Check duplicate enrollment
    const isAlreadyEnrolled = await authStore.isStudentEnrolled(studentId, targetClass.id)
    if (isAlreadyEnrolled) {
      return NextResponse.json(
        { success: false, error: 'You are already enrolled in this class.' },
        { status: 409 },
      )
    }

    // 4. Create enrollment
    await authStore.enrollStudent(studentId, targetClass.id)

    return NextResponse.json({
      success: true,
      message: `Successfully joined ${targetClass.name}!`,
      class: targetClass,
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to join class. Please try again.' },
      { status: 500 },
    )
  }
}
