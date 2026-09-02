import type { ReactNode } from 'react'
import { AppShell } from '@/components/layout/app-shell'
import { studentNav } from '@/components/layout/nav-config'
import { getServerSession } from '@/lib/auth/session'

export default async function StudentLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession()

  const userName = session?.name || 'Alex Rivera'
  const userRole = session ? `Student · ${session.institutionName || 'MKCE'}` : 'Student · Standard Level'

  return (
    <AppShell
      portal="student"
      nav={studentNav}
      user={{ name: userName, role: userRole }}
    >
      {children}
    </AppShell>
  )
}
