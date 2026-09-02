'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  GraduationCap,
  Lock,
  Sparkles,
  UserPlus,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col justify-between selection:bg-primary/20">
      {/* Top Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-md px-4 py-4 sm:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <GraduationCap className="size-5" />
            </div>
            <span className="font-display text-lg font-bold tracking-tight">TeachAI</span>
          </Link>
          <Badge variant="outline" className="text-xs">
            M. Kumarasamy College of Engineering (MKCE2026)
          </Badge>
        </div>
      </header>

      {/* Main Gateway Card */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-2xl space-y-6 animate-in fade-in zoom-in-95">
          <div className="text-center space-y-2">
            <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl text-foreground">
              Welcome to TeachAI
            </h1>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Select your role to sign in to your personalized pedagogical operating system.
            </p>
          </div>

          {/* Two Role Gateway Cards */}
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Student Login Card */}
            <Card className="flex flex-col justify-between p-6 transition-all hover:border-primary/50 hover:shadow-lg group">
              <div className="space-y-3">
                <div className="flex size-12 items-center justify-center rounded-xl bg-chart-2/10 text-chart-2 group-hover:scale-105 transition-transform">
                  <Users className="size-6" />
                </div>
                <div>
                  <h2 className="font-display text-lg font-bold text-foreground">Student Portal</h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    Access adaptive learning tracks, join classes with class codes, take quizzes, and chat with the AI Socratic Tutor.
                  </p>
                </div>
              </div>

              <div className="mt-6 space-y-2">
                <Link href="/student/login">
                  <Button className="w-full gap-2 shadow-sm">
                    Continue as Student
                    <ArrowRight className="size-4" />
                  </Button>
                </Link>
                <Link href="/register/student">
                  <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground hover:text-foreground">
                    Register as Student
                  </Button>
                </Link>
              </div>
            </Card>

            {/* Teacher Login Card */}
            <Card className="flex flex-col justify-between p-6 transition-all hover:border-primary/50 hover:shadow-lg group border-primary/30 bg-primary/[0.02]">
              <div className="space-y-3">
                <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:scale-105 transition-transform">
                  <GraduationCap className="size-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-display text-lg font-bold text-foreground">Teacher Portal</h2>
                    <Badge variant="default" className="text-[10px]">
                      Educator
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Upload materials, analyze concepts, review 3-tier tracks, create classes, simulate student personas, and view live analytics.
                  </p>
                </div>
              </div>

              <div className="mt-6 space-y-2">
                <Link href="/teacher/login">
                  <Button className="w-full gap-2 shadow-sm">
                    Continue as Teacher
                    <ArrowRight className="size-4" />
                  </Button>
                </Link>
                <Link href="/register/teacher">
                  <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground hover:text-foreground">
                    Register as Teacher (Code Required)
                  </Button>
                </Link>
              </div>
            </Card>
          </div>

          {/* Quick Demo Credentials Footer */}
          <Card className="border-border bg-muted/30 p-4">
            <div className="text-xs text-muted-foreground space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-foreground">
                <Sparkles className="size-3.5 text-primary" />
                <span>Hackathon Demo Quick Credentials:</span>
              </div>
              <p>• <strong>Teacher:</strong> <code>priya.menon@school.edu</code> · Password: <code>password123</code></p>
              <p>• <strong>Student:</strong> <code>alex.rivera@school.edu</code> · Password: <code>password123</code></p>
              <p>• <strong>Institution Code:</strong> <code>MKCE2026</code> · Teacher Verification Code: <code>MKCE-TEACH-2026</code></p>
            </div>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-4 text-center text-xs text-muted-foreground">
        © 2026 TeachAI · M. Kumarasamy College of Engineering
      </footer>
    </div>
  )
}
