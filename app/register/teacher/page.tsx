'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  AlertCircle,
  ArrowRight,
  Building,
  CheckCircle2,
  Eye,
  EyeOff,
  GraduationCap,
  KeyRound,
  Lock,
  Mail,
  ShieldCheck,
  User,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function TeacherRegisterPage() {
  const router = useRouter()

  const [name, setName] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [confirmPassword, setConfirmPassword] = React.useState('')
  const [showPassword, setShowPassword] = React.useState(false)
  const [institutionCode, setInstitutionCode] = React.useState('MKCE2026')
  const [teacherVerificationCode, setTeacherVerificationCode] = React.useState('MKCE-TEACH-2026')

  const [isLoading, setIsLoading] = React.useState(false)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.')
      setIsLoading(false)
      return
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          password,
          confirmPassword,
          institutionCode,
          teacherVerificationCode,
          role: 'TEACHER',
        }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        setErrorMessage(data.error || 'Registration failed. Please check your verification code.')
        return
      }

      setSuccessMessage('Teacher account created successfully! Redirecting to login…')
      setTimeout(() => {
        router.push('/teacher-login')
      }, 1500)
    } catch {
      setErrorMessage('Network error during registration. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

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
          <Badge variant="default" className="text-xs">
            Teacher Registration
          </Badge>
        </div>
      </header>

      {/* Registration Card */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-lg space-y-6 animate-in fade-in zoom-in-95">
          <Card className="border-primary/40 shadow-xl bg-card">
            <CardHeader className="space-y-2 border-b border-border/60 pb-5 bg-primary/[0.03]">
              <div className="flex items-center gap-2.5">
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <ShieldCheck className="size-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-xl font-bold">Register as Educator</CardTitle>
                    <Badge variant="outline" className="text-[10px]">
                      Verification Required
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    M. Kumarasamy College of Engineering (MKCE)
                  </p>
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

              {successMessage && (
                <div className="flex items-start gap-2.5 rounded-xl border border-success/30 bg-success/10 p-3 text-xs text-success animate-in fade-in">
                  <CheckCircle2 className="size-4 shrink-0 mt-0.5" />
                  <span>{successMessage}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Full Name & Title
                  </label>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Dr. Priya Menon"
                      className="h-10 w-full rounded-xl border border-input bg-card pl-9 pr-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-2"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Faculty / Teacher Email
                  </label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. priya.menon@school.edu"
                      className="h-10 w-full rounded-xl border border-input bg-card pl-9 pr-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-2"
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
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

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="h-10 w-full rounded-xl border border-input bg-card pl-9 pr-10 text-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-2"
                      />
                    </div>
                  </div>
                </div>

                {/* Institution Code */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Institution Code
                    </label>
                    <span className="text-[11px] text-muted-foreground">Demo: <code>MKCE2026</code></span>
                  </div>
                  <div className="relative">
                    <Building className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      required
                      value={institutionCode}
                      onChange={(e) => setInstitutionCode(e.target.value.toUpperCase())}
                      placeholder="e.g. MKCE2026"
                      className="h-10 w-full rounded-xl border border-input bg-card pl-9 pr-3 font-mono text-sm uppercase outline-none transition-colors focus-visible:border-ring focus-visible:ring-2"
                    />
                  </div>
                </div>

                {/* Teacher Verification Code */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold uppercase tracking-wider text-primary">
                      Teacher Verification Code
                    </label>
                    <span className="text-[11px] text-muted-foreground">Hackathon Demo: <code>MKCE-TEACH-2026</code></span>
                  </div>
                  <div className="relative">
                    <KeyRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-primary" />
                    <input
                      type="text"
                      required
                      value={teacherVerificationCode}
                      onChange={(e) => setTeacherVerificationCode(e.target.value.toUpperCase())}
                      placeholder="e.g. MKCE-TEACH-2026"
                      className="h-10 w-full rounded-xl border border-primary/40 bg-card pl-9 pr-3 font-mono text-sm uppercase outline-none transition-colors focus-visible:border-ring focus-visible:ring-2"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full gap-2 shadow-md h-10 mt-3"
                >
                  {isLoading ? 'Verifying & Registering…' : 'Register Verified Educator Account'}
                  <ArrowRight className="size-4" />
                </Button>
              </form>

              <div className="border-t border-border pt-4 text-center space-y-2 text-xs text-muted-foreground">
                <p>
                  Already registered?{' '}
                  <Link href="/teacher-login" className="font-semibold text-primary hover:underline">
                    Sign in to Teacher Portal
                  </Link>
                </p>
                <p>
                  Are you a student?{' '}
                  <Link href="/register/student" className="font-semibold text-foreground hover:underline">
                    Register as Student
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <footer className="border-t border-border py-4 text-center text-xs text-muted-foreground">
        © 2026 TeachAI · M. Kumarasamy College of Engineering
      </footer>
    </div>
  )
}
