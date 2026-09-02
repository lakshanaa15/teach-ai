import { NextRequest, NextResponse } from 'next/server'
import { authStore } from '@/lib/db/auth-store'
import { hashPassword } from '@/lib/auth/password'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      name,
      email,
      password,
      confirmPassword,
      institutionCode,
      teacherVerificationCode,
      role = 'STUDENT',
      subject,
      className,
    } = body

    // 1. Basic validation
    if (!name?.trim() || !email?.trim() || !password || !confirmPassword || !institutionCode?.trim()) {
      return NextResponse.json(
        { success: false, error: 'All fields are required.' },
        { status: 400 },
      )
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid email address.' },
        { status: 400 },
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 6 characters long.' },
        { status: 400 },
      )
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { success: false, error: 'Passwords do not match.' },
        { status: 400 },
      )
    }

    // 2. Validate Institution Code
    const institution = await authStore.findInstitutionByCode(institutionCode)
    if (!institution) {
      return NextResponse.json(
        { success: false, error: 'Invalid institution code. Please check your institution code.' },
        { status: 400 },
      )
    }

    // 3. Validate Teacher Verification Code if registering as teacher
    if (role === 'TEACHER') {
      if (!teacherVerificationCode?.trim()) {
        return NextResponse.json(
          { success: false, error: 'Teacher verification code is required for teacher registration.' },
          { status: 400 },
        )
      }
      const isValidTeacherCode = authStore.verifyTeacherCode(teacherVerificationCode)
      if (!isValidTeacherCode) {
        return NextResponse.json(
          { success: false, error: 'Invalid teacher verification code.' },
          { status: 400 },
        )
      }
    }

    // 4. Check if user already exists
    const existing = await authStore.findUserByEmail(email)
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'An account with this email already exists.' },
        { status: 409 },
      )
    }

    console.log(`[AUTH-REGISTER] Registering ${role}: ${name} (${email}) for Institution Code: ${institutionCode}`)

    // 5. Hash password and create user
    const passwordHash = await hashPassword(password)
    const { user } = await authStore.createUser({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      passwordHash,
      role: role === 'TEACHER' ? 'TEACHER' : 'STUDENT',
      institutionId: institution.id,
      subject,
      className,
    })

    console.log(`[AUTH-REGISTER] Successfully completed registration for user: ${user.name} (${user.id})`)

    return NextResponse.json({
      success: true,
      message: 'Account created successfully. Please log in.',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        institutionName: institution.name,
      },
    })
  } catch (error) {
    console.error('[AUTH-REGISTER] Registration exception:', error instanceof Error ? error.stack || error.message : String(error))
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Registration failed. Please try again.',
      },
      { status: 500 },
    )
  }
}
