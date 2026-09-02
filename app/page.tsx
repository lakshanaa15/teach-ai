'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  BookOpen,
  Boxes,
  CheckCircle2,
  FileCheck2,
  GraduationCap,
  LayoutDashboard,
  Lightbulb,
  MessageSquareText,
  Play,
  Rocket,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Pipeline } from '@/components/shared/pipeline'

export default function LandingPage() {
  const pipelineSteps = [
    { label: '1. Teach (Materials)', icon: BookOpen },
    { label: '2. Assess (Quizzes)', icon: FileCheck2 },
    { label: '3. Analyze (Gaps)', icon: TrendingUp },
    { label: '4. Adapt (3 Tracks)', icon: Boxes },
    { label: '5. Recommend (AI)', icon: Lightbulb },
  ]

  const features = [
    {
      icon: Boxes,
      badge: 'Differentiator #1',
      title: '3-Tier Adaptive Learning Tracks',
      description:
        'Transform single lesson documents into tiered tracks: Remedial (scaffolded with everyday analogies), Standard (curriculum-aligned), and Advanced (enterprise challenge problems).',
      href: '/teacher/adaptive',
      color: 'bg-primary/10 text-primary',
    },
    {
      icon: Sparkles,
      badge: 'Differentiator #2',
      title: 'Simulated Student Personas',
      description:
        'Stress-test your lesson before stepping into class. Simulate Struggling (38%), Average (66%), and Advanced (92%) learners to uncover hidden misconceptions, confusion points, and engagement gaps.',
      href: '/teacher/simulation',
      color: 'bg-chart-2/10 text-chart-2',
    },
    {
      icon: ShieldCheck,
      badge: 'Human-in-the-Loop',
      title: 'Teacher Verification & Approval',
      description:
        'AI generates → Teacher reviews & edits → Teacher approves & assigns. Ensures high-quality pedagogical oversight before content reaches students.',
      href: '/teacher/adaptive',
      color: 'bg-success/10 text-success',
    },
    {
      icon: TrendingUp,
      badge: 'Differentiator #3',
      title: 'Granular Learning Gap Diagnostics',
      description:
        'Move beyond high-level letter grades. Pinpoint exact cognitive hurdles (e.g. "Foreign keys in Many-to-Many junction tables" or "Unit circle sign mapping") across your class.',
      href: '/teacher/analytics',
      color: 'bg-warning/15 text-warning-foreground',
    },
    {
      icon: Lightbulb,
      badge: 'Differentiator #4',
      title: 'Autonomous Recommendation Engine',
      description:
        'Generate targeted intervention pathways from quiz results. Assign remedial practice, interactive diagrams, and challenge sets with single-click teacher approvals.',
      href: '/teacher/recommendations',
      color: 'bg-chart-5/10 text-chart-5',
    },
    {
      icon: MessageSquareText,
      badge: 'Student Experience',
      title: '24/7 Socratic AI Tutor',
      description:
        'Adaptive student tutoring that adjusts tone and complexity to the learner’s tier, diagnosing quiz mistakes, providing hints, and asking reflective guiding questions.',
      href: '/student/tutor',
      color: 'bg-primary/10 text-primary',
    },
  ]

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20">
      {/* Navigation Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <GraduationCap className="size-5" />
            </div>
            <span className="font-display text-lg font-bold tracking-tight">TeachAI</span>
            <Badge variant="outline" className="ml-2 hidden text-xs font-medium sm:inline-flex">
              Hackathon MVP
            </Badge>
          </div>

          <nav className="hidden items-center gap-6 md:flex">
            <Link
              href="#cycle"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              The Cycle
            </Link>
            <Link
              href="#features"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Core Features
            </Link>
            <Link
              href="#demo"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Demo Flows
            </Link>
          </nav>

          <div className="flex items-center gap-2.5">
            <Link href="/login">
              <Button variant="ghost" size="sm" className="text-xs">
                Sign In
              </Button>
            </Link>
            <Link href="/student">
              <Button variant="outline" size="sm" className="hidden sm:inline-flex">
                Student Portal
              </Button>
            </Link>
            <Link href="/teacher">
              <Button size="sm" className="gap-1.5 shadow-sm">
                Teacher Portal
                <ArrowRight className="size-4" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 sm:pt-20 sm:pb-28">
        {/* Background glow effects */}
        <div className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-96 w-[600px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute top-1/2 -right-40 -z-10 h-80 w-80 rounded-full bg-chart-2/10 blur-3xl" />

        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3.5 py-1.5 text-xs font-semibold text-primary sm:text-sm">
            <Sparkles className="size-4 animate-pulse" />
            <span>Not Just a Chatbot — A Full Pedagogical Operating System</span>
          </div>

          <h1 className="mt-6 font-display text-4xl font-extrabold tracking-tight text-balance sm:text-6xl lg:text-7xl">
            Teach Smarter. <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-primary via-chart-2 to-primary bg-clip-text text-transparent">
              Personalize Every Learner.
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground text-pretty sm:text-xl">
            Empower educators with adaptive content tracks, simulated student feedback, automated
            quality evaluations, and automated gap-closing recommendations.
          </p>

          {/* Call to action buttons */}
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
            <Link href="/teacher" className="w-full sm:w-auto">
              <Button size="lg" className="w-full gap-2 text-base shadow-md sm:w-auto">
                <LayoutDashboard className="size-5" />
                Launch Teacher Portal
              </Button>
            </Link>
            <Link href="/student" className="w-full sm:w-auto">
              <Button
                variant="outline"
                size="lg"
                className="w-full gap-2 text-base sm:w-auto"
              >
                <Users className="size-5" />
                Launch Student Portal
              </Button>
            </Link>
          </div>

          {/* Quick Hackathon Demo Selector */}
          <div className="mt-12 rounded-2xl border border-border bg-card/60 p-5 shadow-sm backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              ⚡ Seamless Hackathon Demo Workflow
            </p>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
              <Link href="/teacher/materials">
                <Button variant="secondary" size="sm" className="gap-1.5 text-xs">
                  <BookOpen className="size-3.5" />
                  1. Analyze Material (DBMS)
                </Button>
              </Link>
              <Link href="/teacher/adaptive">
                <Button variant="secondary" size="sm" className="gap-1.5 text-xs">
                  <Boxes className="size-3.5" />
                  2. Review & Approve Tracks
                </Button>
              </Link>
              <Link href="/teacher/simulation">
                <Button variant="secondary" size="sm" className="gap-1.5 text-xs">
                  <Sparkles className="size-3.5" />
                  3. Simulate Learners
                </Button>
              </Link>
              <Link href="/student/learning">
                <Button variant="secondary" size="sm" className="gap-1.5 text-xs">
                  <Play className="size-3.5" />
                  4. Student Learning
                </Button>
              </Link>
              <Link href="/student/quizzes">
                <Button variant="secondary" size="sm" className="gap-1.5 text-xs">
                  <Zap className="size-3.5" />
                  5. Take Quiz & AI Evaluation
                </Button>
              </Link>
              <Link href="/teacher/analytics">
                <Button variant="secondary" size="sm" className="gap-1.5 text-xs">
                  <TrendingUp className="size-3.5" />
                  6. Real-time Analytics
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* The Core Cycle Section */}
      <section id="cycle" className="border-y border-border bg-muted/30 py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="font-display text-2xl font-bold tracking-tight sm:text-4xl">
              The Continuous Learning Cycle
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">
              TeachAI closes the pedagogical loop by connecting classroom instruction directly to student diagnostics.
            </p>
          </div>

          <div className="mt-10 flex justify-center">
            <Pipeline steps={pipelineSteps} className="justify-center" />
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
            <Card className="border-border/60 bg-card/80">
              <CardContent className="p-5">
                <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <BookOpen className="size-5" />
                </div>
                <h3 className="mt-3 font-semibold text-foreground">1. Teach</h3>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  Upload lesson materials and generate tailored multi-level tracks for varied student readiness.
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-card/80">
              <CardContent className="p-5">
                <div className="flex size-9 items-center justify-center rounded-lg bg-chart-2/10 text-chart-2">
                  <FileCheck2 className="size-5" />
                </div>
                <h3 className="mt-3 font-semibold text-foreground">2. Assess</h3>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  Generate formative quizzes with MCQs, True/False, and short-answer questions tailored to topic objectives.
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-card/80">
              <CardContent className="p-5">
                <div className="flex size-9 items-center justify-center rounded-lg bg-warning/15 text-warning-foreground">
                  <TrendingUp className="size-5" />
                </div>
                <h3 className="mt-3 font-semibold text-foreground">3. Analyze</h3>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  Identify specific conceptual misunderstandings and spot at-risk learners before exam day.
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-card/80">
              <CardContent className="p-5">
                <div className="flex size-9 items-center justify-center rounded-lg bg-success/10 text-success">
                  <Boxes className="size-5" />
                </div>
                <h3 className="mt-3 font-semibold text-foreground">4. Adapt</h3>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  Deliver remedial scaffolding or advanced stretch problems matched to individual mastery levels.
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-card/80">
              <CardContent className="p-5">
                <div className="flex size-9 items-center justify-center rounded-lg bg-chart-5/10 text-chart-5">
                  <Lightbulb className="size-5" />
                </div>
                <h3 className="mt-3 font-semibold text-foreground">5. Recommend</h3>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  Deliver actionable, bite-sized tasks and matched educational media with 1-click teacher assignment.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Main Differentiating Features Section */}
      <section id="features" className="py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <Badge variant="default" className="text-xs">
              Key Capabilities
            </Badge>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Engineered for Real Classrooms
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
              Every tool is purpose-built to save teachers hours of prep time while providing students with hyper-personalized learning pathways.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feat) => (
              <Card key={feat.title} className="group transition-all hover:border-primary/40 hover:shadow-md">
                <CardContent className="flex h-full flex-col justify-between p-6">
                  <div>
                    <div className="flex items-center justify-between">
                      <div className={`flex size-11 items-center justify-center rounded-xl ${feat.color}`}>
                        <feat.icon className="size-5.5" />
                      </div>
                      <Badge variant="outline" className="text-[11px] font-medium">
                        {feat.badge}
                      </Badge>
                    </div>
                    <h3 className="mt-4 font-display text-lg font-semibold text-foreground">
                      {feat.title}
                    </h3>
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                      {feat.description}
                    </p>
                  </div>
                  <div className="mt-6 border-t border-border pt-4">
                    <Link href={feat.href} className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline">
                      Explore feature <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Portal Selection Split Banner */}
      <section id="demo" className="border-t border-border bg-muted/20 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-2">
            {/* Teacher Card */}
            <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <GraduationCap className="size-6" />
                </div>
                <div>
                  <h3 className="font-display text-xl font-bold">Teacher Portal</h3>
                  <p className="text-xs text-muted-foreground">For Dr. Priya Menon · Grade 10 Advanced Track</p>
                </div>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                Upload DBMS & Math materials, auto-extract concepts, generate 3-tier adaptive tracks, review and approve content, simulate student confusion points, and inspect real-time gap analytics.
              </p>
              <ul className="mt-4 space-y-2 text-xs text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-success" /> Adaptive track generation & teacher approval pipeline
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-success" /> 3-tier simulated student cognitive diagnostics
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-success" /> Real-time class analytics synced to student quiz results
                </li>
              </ul>
              <div className="mt-6">
                <Link href="/teacher">
                  <Button className="w-full gap-2">
                    Enter Teacher Dashboard
                    <ArrowRight className="size-4" />
                  </Button>
                </Link>
              </div>
            </div>

            {/* Student Card */}
            <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-chart-2 text-white">
                  <Users className="size-6" />
                </div>
                <div>
                  <h3 className="font-display text-xl font-bold">Student Portal</h3>
                  <p className="text-xs text-muted-foreground">For Alex Rivera · Standard Level</p>
                </div>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                Experience adaptive learning: study teacher-assigned tracks (e.g. DBMS ER Model), take interactive formative quizzes with instant score breakdowns, view detected weak concepts, and converse with the AI Tutor.
              </p>
              <ul className="mt-4 space-y-2 text-xs text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-success" /> Assigned learning paths with step-by-step demonstrations
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-success" /> Concept-mapped quizzes with immediate explanations
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-success" /> Socratic AI Tutor with deep knowledge on ER models and math
                </li>
              </ul>
              <div className="mt-6">
                <Link href="/student">
                  <Button variant="outline" className="w-full gap-2">
                    Enter Student Dashboard
                    <ArrowRight className="size-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-background py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 text-xs text-muted-foreground sm:flex-row sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <GraduationCap className="size-4 text-primary" />
            <span className="font-semibold text-foreground">TeachAI</span>
            <span>— AI-Powered Teaching Assistant & Adaptive Learning Platform</span>
          </div>
          <p>© 2026 TeachAI. Built for hackathon demonstration.</p>
        </div>
      </footer>
    </div>
  )
}
