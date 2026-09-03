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
  School,
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
  classes: School,
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
      if (typeof window !== 'undefined') {
        localStorage.removeItem('teachai_session_data_v2')
      }
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/login')
      router.refresh()
    } catch {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('teachai_session_data_v2')
      }
      router.push('/login')
    }
  }

  const otherPortal = portal === 'teacher' ? 'student' : 'teacher'
  const BrandIcon = navIconMap.brand

  const SidebarInner = (
    <div className="flex h-full flex-col bg-sidebar">
      <div className="flex h-16 items-center gap-3 px-5 border-b border-sidebar-border">
        <div className="flex size-9.5 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
          <BrandIcon className="size-5" />
        </div>
        <div className="leading-tight min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-display text-sm font-bold tracking-tight text-foreground">TeachAI</span>
            <span className="rounded bg-primary/10 px-1 py-0.5 text-[9px] font-mono font-bold uppercase text-primary">SaaS</span>
          </div>
          <p className="text-[11px] capitalize text-muted-foreground truncate">{portal} Portal</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
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
                'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold transition-all',
                active
                  ? 'bg-primary/10 text-primary font-bold shadow-xs'
                  : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
              )}
            >
              {active && (
                <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-primary" />
              )}
              <IconComponent className={cn('size-4 shrink-0 transition-transform group-hover:scale-105', active ? 'text-primary' : 'text-muted-foreground')} />
              <span className="flex-1 truncate">{item.label}</span>
              {item.highlight && (
                <span
                  className="rounded bg-primary/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary"
                  title="Key AI feature"
                >
                  AI
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-sidebar-border p-3 space-y-2.5 bg-sidebar/50">
        <Link href={`/${otherPortal}`}>
          <Button variant="outline" size="sm" className="w-full justify-start text-xs gap-2 rounded-lg">
            <ArrowLeftRight className="size-3.5 text-muted-foreground" />
            Switch to {otherPortal} view
          </Button>
        </Link>
        <div className="flex items-center justify-between rounded-xl border border-border/70 bg-card p-2 shadow-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <Avatar name={user.name} className="size-8 shrink-0 ring-1 ring-border" />
            <div className="min-w-0 leading-tight">
              <p className="truncate text-xs font-bold text-foreground">{user.name}</p>
              <p className="truncate text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">{user.role}</p>
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
              className="absolute inset-0 bg-foreground/40 backdrop-blur-xs transition-opacity"
              onClick={() => setMobileOpen(false)}
              aria-hidden="true"
            />
            <aside className="absolute inset-y-0 left-0 w-64 border-r border-sidebar-border bg-sidebar animate-in slide-in-from-left duration-200">
              <Button
                variant="ghost"
                size="icon-sm"
                className="absolute right-2.5 top-3.5 z-10"
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
              >
                <X className="size-4" />
              </Button>
              {SidebarInner}
            </aside>
          </div>
        )}

        <div className="lg:pl-64">
          {/* Topbar */}
          <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-border bg-background/85 px-4 backdrop-blur-md sm:px-6">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <Button
                variant="ghost"
                size="icon-sm"
                className="lg:hidden shrink-0"
                onClick={() => setMobileOpen(true)}
                aria-label="Open menu"
              >
                <Menu className="size-4" />
              </Button>
              <div className="relative hidden max-w-md flex-1 sm:block">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="search"
                  placeholder="Search students, classes, lesson plans, topics…"
                  className="h-9 w-full rounded-xl border border-input bg-card pl-9 pr-3 text-xs outline-none transition-all focus-visible:border-ring focus-visible:ring-2 font-medium"
                />
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <div className="hidden md:flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs text-muted-foreground">
                <span className="size-2 rounded-full bg-success animate-pulse" />
                <span className="font-semibold text-[11px] text-foreground truncate">MKCE Portal</span>
              </div>
              <Button variant="ghost" size="icon-sm" aria-label="Notifications" className="relative rounded-lg">
                <Bell className="size-4 text-muted-foreground" />
                <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-destructive" />
              </Button>
              <Avatar name={user.name} className="size-8 lg:hidden ring-1 ring-border" />
            </div>
          </header>

          <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
        </div>
      </div>
    </ToastProvider>
  )
}
