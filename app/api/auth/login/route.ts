import { NextRequest, NextResponse } from 'next/server'
import { authStore } from '@/lib/db/auth-store'
import { verifyPassword } from '@/lib/auth/password'
import { createSessionToken, SESSION_COOKIE_NAME } from '@/lib/auth/session'
import { getPrisma } from '@/lib/db/prisma'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, password, portal } = body

    if (!email?.trim() || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required.' },
        { status: 400 },
      )
    }

    const user = await authStore.findUserByEmail(email)
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password.' },
        { status: 401 },
      )
    }

    const isValid = await verifyPassword(password, user.passwordHash)
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password.' },
        { status: 401 },
      )
    }

    // Role check if portal was specified
    if (portal === 'teacher' && user.role !== 'TEACHER') {
      return NextResponse.json(
        { success: false, error: 'This is a Student account. Please log in through the Student portal.' },
        { status: 403 },
      )
    }

    if (portal === 'student' && user.role !== 'STUDENT') {
      return NextResponse.json(
        { success: false, error: 'This is a Teacher account. Please log in through the Teacher portal.' },
        { status: 403 },
      )
    }

    // Fetch related profile details
    let teacherId: string | undefined
    let studentId: string | undefined
    let className: string | undefined

    const prisma = getPrisma()
    let institutionName = 'M. Kumarasamy College of Engineering'
    let institutionCode = 'MKCE2026'

    if (prisma) {
      const inst = await prisma.institution.findUnique({
        where: { id: user.institutionId },
      })
      if (inst) {
        institutionName = inst.name
        institutionCode = inst.code
      }
    }

    if (user.role === 'TEACHER') {
      const teacher = await authStore.findTeacherByUserId(user.id)
      teacherId = teacher?.id
      if (prisma && teacherId) {
        const latestClass = await prisma.class.findFirst({
          where: { teacherId },
          orderBy: { createdAt: 'desc' },
        })
        if (latestClass) {
          className = latestClass.name
        }
      }
      if (!className && teacher?.className) {
        className = teacher.className
      }
    } else {
      const student = await authStore.findStudentByUserId(user.id)
      studentId = student?.id
    }

    // Create session token
    const token = createSessionToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      institutionId: user.institutionId,
      institutionName,
      institutionCode,
      teacherId,
      studentId,
      className,
    })

    const redirectTo = user.role === 'TEACHER' ? '/teacher' : '/student'

    const response = NextResponse.json({
      success: true,
      redirectTo,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        institutionName,
        institutionCode,
        teacherId,
        studentId,
        className,
      },
    })

    // Set secure HTTP-only cookie
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    })

    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { success: false, error: 'Login failed. Please try again.' },
      { status: 500 },
    )
  }
}
