import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const SESSION_COOKIE_NAME = 'teachai_session'
const SECRET = process.env.SESSION_SECRET || 'teachai-secure-cryptographic-jwt-session-secret-2026'

// Edge-compatible JWT verification using Web Crypto API
async function verifyJwtInEdge(token: string): Promise<{ role: 'STUDENT' | 'TEACHER'; email: string } | null> {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null

    const [headerB64, payloadB64, signatureB64] = parts
    const dataToSign = `${headerB64}.${payloadB64}`

    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify'],
    )

    // Decode base64url signature
    const binarySignature = Uint8Array.from(
      atob(signatureB64.replace(/-/g, '+').replace(/_/g, '/')),
      (c) => c.charCodeAt(0),
    )

    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      binarySignature,
      encoder.encode(dataToSign),
    )

    if (!isValid) return null

    // Decode payload
    const payloadStr = atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'))
    const payload = JSON.parse(payloadStr)

    const now = Math.floor(Date.now() / 1000)
    if (payload.exp && payload.exp < now) return null

    return payload
  } catch {
    return null
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Public authentication routes
  const isAuthRoute =
    pathname === '/login' ||
    pathname === '/student/login' ||
    pathname === '/teacher/login' ||
    pathname.startsWith('/register')

  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)
  const session = sessionCookie?.value ? await verifyJwtInEdge(sessionCookie.value) : null

  // If user is already authenticated and visits login/register, redirect them to their portal
  if (isAuthRoute && session) {
    const destination = session.role === 'TEACHER' ? '/teacher' : '/student'
    return NextResponse.redirect(new URL(destination, request.url))
  }

  // Protect Teacher routes (/teacher/*)
  if (pathname.startsWith('/teacher')) {
    // Exception for /teacher/login
    if (pathname === '/teacher/login') return NextResponse.next()

    if (!session) {
      const loginUrl = new URL('/teacher/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }

    if (session.role !== 'TEACHER') {
      return NextResponse.redirect(new URL('/student?error=unauthorized_teacher_access', request.url))
    }
  }

  // Protect Student routes (/student/*)
  if (pathname.startsWith('/student')) {
    // Exception for /student/login
    if (pathname === '/student/login') return NextResponse.next()

    if (!session) {
      const loginUrl = new URL('/student/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }

    if (session.role !== 'STUDENT') {
      return NextResponse.redirect(new URL('/teacher?error=unauthorized_student_access', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/teacher/:path*',
    '/student/:path*',
    '/login',
    '/register/:path*',
  ],
}
