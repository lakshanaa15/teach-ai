'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  ArrowLeftRight,
  BarChart3,
  Bell,
  BookOpen,
  Boxes,
  ClipboardList,
  FileCheck2,
  GraduationCap,
  LayoutDashboard,
  Lightbulb,
  LogOut,
  Menu,
  MessageSquareText,
  Search,
  Settings,
  Sparkles,
  TrendingUp,
  UserSquare,
  Users,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/ui/avatar'
import type { NavIconName, NavItem } from '@/components/layout/nav-config'
import { ToastProvider } from '@/components/shared/toast'

const navIconMap: Record<NavIconName, React.ComponentType<{ className?: string }>> = {
  dashboard: LayoutDashboard,
  materials: BookOpen,
  'lesson-plans': FileCheck2,
  adaptive: Boxes,
  simulation: Sparkles,
  quizzes: ClipboardList,
  students: Users,
  analytics: BarChart3,
  recommendations: Lightbulb,
  settings: Settings,
  learning: BookOpen,
  progress: TrendingUp,
  tutor: MessageSquareText,
  profile: UserSquare,
  brand: GraduationCap,
}

export function AppShell({
  portal,
  nav,
  user,
  children,
}: {
  portal: 'teacher' | 'student'
  nav: NavItem[]
  user: { name: string; role: string }
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = React.useState(false)
  const [isLoggingOut, setIsLoggingOut] = React.useState(false)

  React.useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/login')
      router.refresh()
    } catch {
      router.push('/login')
    }
  }

  const otherPortal = portal === 'teacher' ? 'student' : 'teacher'
  const BrandIcon = navIconMap.brand

  const SidebarInner = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-2.5 px-5">
        <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <BrandIcon className="size-5" />
        </div>
        <div className="leading-tight">
          <p className="font-display text-sm font-semibold">TeachAI</p>
          <p className="text-xs capitalize text-muted-foreground">{portal} portal</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {nav.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== `/${portal}` && pathname.startsWith(item.href))
          const IconComponent = navIconMap[item.icon] || LayoutDashboard

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                active
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground',
              )}
            >
              <IconComponent className="size-4.5 shrink-0" />
              <span className="flex-1 truncate">{item.label}</span>
              {item.highlight && (
                <span
                  className="size-1.5 rounded-full bg-primary"
                  aria-label="Key feature"
                  title="Key differentiator"
                />
              )}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-sidebar-border p-3 space-y-2">
        <Link href={`/${otherPortal}`}>
          <Button variant="outline" size="sm" className="w-full justify-start text-xs">
            <ArrowLeftRight className="size-3.5" />
            Switch to {otherPortal} view
          </Button>
        </Link>
        <div className="flex items-center justify-between rounded-lg bg-muted/40 p-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <Avatar name={user.name} className="size-8 shrink-0" />
            <div className="min-w-0 leading-tight">
              <p className="truncate text-xs font-semibold text-foreground">{user.name}</p>
              <p className="truncate text-[10px] text-muted-foreground">{user.role}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={handleLogout}
            disabled={isLoggingOut}
            title="Log out"
            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          >
            <LogOut className="size-3.5" />
          </Button>
        </div>
      </div>
    </div>
  )

  return (
    <ToastProvider>
      <div className="min-h-svh bg-background">
        {/* Desktop sidebar */}
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-sidebar-border bg-sidebar lg:block">
          {SidebarInner}
        </aside>

        {/* Mobile drawer */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="absolute inset-0 bg-foreground/40 backdrop-blur-[2px]"
              onClick={() => setMobileOpen(false)}
              aria-hidden="true"
            />
            <aside className="absolute inset-y-0 left-0 w-64 border-r border-sidebar-border bg-sidebar animate-in slide-in-from-left">
              <Button
                variant="ghost"
                size="icon-sm"
                className="absolute right-2 top-3"
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
              >
                <X />
              </Button>
              {SidebarInner}
            </aside>
          </div>
        )}

        <div className="lg:pl-64">
          {/* Topbar */}
          <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur sm:px-6">
            <Button
              variant="ghost"
              size="icon-sm"
              className="lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <Menu />
            </Button>
            <div className="relative hidden max-w-md flex-1 sm:block">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                placeholder="Search students, materials, topics…"
                className="h-9 w-full rounded-lg border border-input bg-card pl-9 pr-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25"
              />
            </div>
            <div className="flex flex-1 items-center justify-end gap-2">
              <Button variant="ghost" size="icon-sm" aria-label="Notifications" className="relative">
                <Bell />
                <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-destructive" />
              </Button>
              <Avatar name={user.name} className="size-8 lg:hidden" />
            </div>
          </header>

          <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
        </div>
      </div>
    </ToastProvider>
  )
}
