import { NextResponse } from 'next/server'
import { SESSION_COOKIE_NAME } from '@/lib/auth/session'

export async function POST() {
  const response = NextResponse.json({
    success: true,
    message: 'Logged out successfully',
    redirectTo: '/login',
  })

  // Clear session cookie
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: '',
    httpOnly: true,
    path: '/',
    maxAge: 0,
  })

  return response
}
