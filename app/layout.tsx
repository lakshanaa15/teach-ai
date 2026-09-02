import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Inter, Sora } from 'next/font/google'
import { SessionProvider } from '@/lib/session-context'
import { getServerSession } from '@/lib/auth/session'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const sora = Sora({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'TeachAI — Teach Smarter. Personalize Every Learner.',
  description:
    'TeachAI is an AI-powered teaching assistant that helps teachers create adaptive content, simulate learners, detect learning gaps, and deliver personalized recommendations — a continuous teach, assess, analyze, recommend, improve cycle.',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#ffffff',
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const session = await getServerSession()
  const initialUser = session
    ? {
        id: session.userId,
        name: session.name,
        email: session.email,
        role: session.role,
        institutionName: session.institutionName,
        className: session.className,
        teacherId: session.teacherId,
        studentId: session.studentId,
      }
    : null

  return (
    <html lang="en" className={`${inter.variable} ${sora.variable} bg-background`}>
      <body className="font-sans antialiased">
        <SessionProvider initialUser={initialUser}>{children}</SessionProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
