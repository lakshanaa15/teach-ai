import type { ReactNode } from 'react'
import { AppShell } from '@/components/layout/app-shell'
import { teacherNav } from '@/components/layout/nav-config'
import { getServerSession } from '@/lib/auth/session'

export default async function TeacherLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession()

  const userName = session?.name || 'Dr. Priya Menon'
  const userRole = session ? `Teacher · ${session.institutionName || 'MKCE'}` : 'Teacher · Computer Science'

  return (
    <AppShell
      portal="teacher"
      nav={teacherNav}
      user={{ name: userName, role: userRole }}
    >
      {children}
    </AppShell>
  )
}
