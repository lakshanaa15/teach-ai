'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  GraduationCap,
  Lock,
  Mail,
  Sparkles,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAppSession } from '@/lib/session-context'

function StudentLoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectPath = searchParams.get('redirect') || '/student'
  const { syncAuthenticatedUser } = useAppSession()

  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [showPassword, setShowPassword] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)

  const handleDemoFill = () => {
    setEmail('alex.rivera@school.edu')
    setPassword('password123')
    setErrorMessage(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setErrorMessage(null)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, portal: 'student' }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        setErrorMessage(data.error || 'Invalid email or password.')
        return
      }

      if (data.user && syncAuthenticatedUser) {
        syncAuthenticatedUser(data.user)
      }

      router.push(redirectPath)
      router.refresh()
    } catch {
      setErrorMessage('Network error during login. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="border-border shadow-xl bg-card rounded-2xl overflow-hidden">
      <CardHeader className="space-y-2 border-b border-border/60 p-6 bg-gradient-to-br from-chart-2/5 via-background to-transparent">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-chart-2/10 text-chart-2 shadow-sm">
            <Users className="size-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-xl font-bold">Student Portal Sign In</CardTitle>
              <Badge variant="secondary" className="text-[10px]">
                Student
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">M. Kumarasamy College of Engineering</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-4">
        {errorMessage && (
          <div className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive animate-in fade-in">
            <AlertCircle className="size-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Student Email Address
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alex.rivera@school.edu"
                className="h-10 w-full rounded-xl border border-input bg-card pl-9 pr-3 text-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-2"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Password
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="h-10 w-full rounded-xl border border-input bg-card pl-9 pr-10 text-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-2"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full gap-2 shadow-md h-10 mt-2 font-semibold text-xs"
          >
            {isLoading ? 'Signing in…' : 'Sign in to Student Portal'}
            <ArrowRight className="size-4" />
          </Button>
        </form>

        {/* 1-Click Demo Shortcut */}
        <div className="pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDemoFill}
            className="w-full gap-1.5 text-xs border-primary/30 bg-primary/5 hover:bg-primary/10 text-primary"
          >
            <Sparkles className="size-3.5" />
            Fill Demo Student (Alex Rivera)
          </Button>
        </div>

        <div className="border-t border-border pt-4 text-center space-y-2 text-xs text-muted-foreground">
          <p>
            Don't have an account?{' '}
            <Link href="/register/student" className="font-semibold text-primary hover:underline">
              Register as Student
            </Link>
          </p>
          <p>
            Are you a teacher?{' '}
            <Link href="/teacher-login" className="font-semibold text-foreground hover:underline">
              Teacher Login
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

export default function StudentLoginPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col justify-between selection:bg-primary/20">
      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-md px-4 py-4 sm:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <GraduationCap className="size-5" />
            </div>
            <span className="font-display text-lg font-bold tracking-tight">TeachAI</span>
          </Link>
          <Badge variant="outline" className="text-xs">
            Student Portal
          </Badge>
        </div>
      </header>

      {/* Login Card */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md space-y-6 animate-in fade-in zoom-in-95">
          <React.Suspense fallback={<div className="h-64 rounded-xl border border-border bg-card animate-pulse" />}>
            <StudentLoginForm />
          </React.Suspense>
        </div>
      </main>

      <footer className="border-t border-border py-4 text-center text-xs text-muted-foreground">
        © 2026 TeachAI · Institution Code: MKCE2026
      </footer>
    </div>
  )
}
