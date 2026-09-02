import crypto from 'crypto'
import { cookies } from 'next/headers'

export interface SessionPayload {
  userId: string
  name: string
  email: string
  role: 'STUDENT' | 'TEACHER'
  institutionId: string
  institutionName: string
  institutionCode: string
  teacherId?: string
  studentId?: string
  className?: string
  exp: number
  iat: number
}

export const SESSION_COOKIE_NAME = 'teachai_session'
const SESSION_EXPIRATION_DAYS = 7
const SECRET = process.env.SESSION_SECRET || 'teachai-secure-cryptographic-jwt-session-secret-2026'

function base64UrlEncode(str: string): string {
  return Buffer.from(str).toString('base64url')
}

function base64UrlDecode(str: string): string {
  return Buffer.from(str, 'base64url').toString('utf-8')
}

export function createSessionToken(
  data: Omit<SessionPayload, 'exp' | 'iat'>,
): string {
  const header = { alg: 'HS256', typ: 'JWT' }
  const now = Math.floor(Date.now() / 1000)
  const payload: SessionPayload = {
    ...data,
    iat: now,
    exp: now + SESSION_EXPIRATION_DAYS * 24 * 60 * 60,
  }

  const encodedHeader = base64UrlEncode(JSON.stringify(header))
  const encodedPayload = base64UrlEncode(JSON.stringify(payload))
  const dataToSign = `${encodedHeader}.${encodedPayload}`

  const signature = crypto
    .createHmac('sha256', SECRET)
    .update(dataToSign)
    .digest('base64url')

  return `${dataToSign}.${signature}`
}

export function verifySessionToken(token: string): SessionPayload | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null

    const [encodedHeader, encodedPayload, signature] = parts
    const dataToSign = `${encodedHeader}.${encodedPayload}`

    const expectedSignature = crypto
      .createHmac('sha256', SECRET)
      .update(dataToSign)
      .digest('base64url')

    if (
      !crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature),
      )
    ) {
      return null
    }

    const payload: SessionPayload = JSON.parse(base64UrlDecode(encodedPayload))
    const now = Math.floor(Date.now() / 1000)

    if (payload.exp && payload.exp < now) {
      return null
    }

    return payload
  } catch {
    return null
  }
}

export async function getServerSession(): Promise<SessionPayload | null> {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)
    if (!sessionCookie?.value) return null
    return verifySessionToken(sessionCookie.value)
  } catch {
    return null
  }
}
