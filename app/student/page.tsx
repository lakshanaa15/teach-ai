'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Boxes,
  CheckCircle2,
  Clock,
  Flame,
  GraduationCap,
  Lightbulb,
  MessageSquareText,
  Play,
  Plus,
  Rocket,
  School,
  Sparkles,
  TrendingUp,
  Zap,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { StatCard } from '@/components/shared/stat-card'
import { DonutChart, LineChart } from '@/components/shared/charts'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LevelBadge } from '@/components/shared/badges'
import { RecommendationCard } from '@/components/shared/recommendation-card'
import { useAppSession } from '@/lib/session-context'

interface EnrolledClass {
  id: string
  name: string
  classCode: string
  subject?: string
  teacherName?: string
}

export default function StudentDashboard() {
  const {
    students,
    studentUser,
    studentRecommendations,
    studentQuizResults,
    selectedTopic,
    approvalStatuses,
  } = useAppSession()

  const [classCodeInput, setClassCodeInput] = React.useState('')
  const [isJoining, setIsJoining] = React.useState(false)
  const [joinFeedback, setJoinFeedback] = React.useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)
  const [enrolledClasses, setEnrolledClasses] = React.useState<EnrolledClass[]>([
    {
      id: 'cls-1',
      name: 'DBMS - III CSE A',
      classCode: 'DBMS3A26',
      subject: 'Database Management Systems',
      teacherName: 'Dr. Priya Menon',
    },
  ])

  // Fetch student enrolled classes
  React.useEffect(() => {
    fetch('/api/classes/enrolled')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.success && data.classes?.length > 0) {
          setEnrolledClasses(data.classes)
        }
      })
      .catch(() => {})
  }, [])

  const handleJoinClass = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!classCodeInput.trim()) return
    setIsJoining(true)
    setJoinFeedback(null)

    try {
      const res = await fetch('/api/classes/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classCode: classCodeInput.trim() }),
      })
      const data = await res.json()

      if (!res.ok || !data.success) {
        setJoinFeedback({
          type: 'error',
          message: data.error || 'Invalid class code. Please check your code.',
        })
        return
      }

      setJoinFeedback({
        type: 'success',
        message: data.message || 'Successfully joined class!',
      })
      if (data.class) {
        setEnrolledClasses((prev) => [
          {
            ...data.class,
            teacherName: 'Dr. Priya Menon',
          },
          ...prev.filter((c) => c.id !== data.class.id),
        ])
      }
      setClassCodeInput('')
    } catch {
      setJoinFeedback({
        type: 'error',
        message: 'Network error. Please try again.',
      })
    } finally {
      setIsJoining(false)
    }
  }

  const currentStudent = students[0] // Alex Rivera
  const isDBMS = selectedTopic.toLowerCase().includes('er') || selectedTopic.toLowerCase().includes('dbms')

  return (
    <div className="space-y-8">
      {/* Header */}
      <PageHeader
        title={`Welcome back, ${studentUser.name}!`}
        description={`Grade 10 · ${studentUser.currentSubject} · M. Kumarasamy College of Engineering (MKCE) · You're on a ${studentUser.streak}-day learning streak 🔥`}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/student/tutor">
              <Button size="sm" className="gap-1.5 shadow-sm">
                <MessageSquareText className="size-4" />
                Ask AI Tutor
              </Button>
            </Link>
          </div>
        }
      />

      {/* JOIN A CLASS & ENROLLED SECTIONS */}
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <School className="size-5 text-primary" />
              <CardTitle className="text-lg font-bold">My Classes & Sections</CardTitle>
            </div>
            <span className="text-xs text-muted-foreground">
              Institution: <strong>M. Kumarasamy College of Engineering</strong>
            </span>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid gap-6 md:grid-cols-3">
            {/* Join Class Form Box */}
            <div className="rounded-xl border border-primary/30 bg-primary/[0.02] p-4 space-y-3">
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-foreground">Join a Class</h4>
                <p className="text-xs text-muted-foreground">
                  Enter the 8-character Class Code provided by your teacher (e.g. <code>DBMS3A26</code>).
                </p>
              </div>

              {joinFeedback && (
                <div
                  className={`flex items-start gap-2 rounded-lg p-2.5 text-xs ${
                    joinFeedback.type === 'success'
                      ? 'border border-success/30 bg-success/10 text-success'
                      : 'border border-destructive/30 bg-destructive/10 text-destructive'
                  }`}
                >
                  {joinFeedback.type === 'success' ? (
                    <CheckCircle2 className="size-4 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="size-4 shrink-0 mt-0.5" />
                  )}
                  <span>{joinFeedback.message}</span>
                </div>
              )}

              <form onSubmit={handleJoinClass} className="space-y-2.5">
                <input
                  type="text"
                  required
                  value={classCodeInput}
                  onChange={(e) => setClassCodeInput(e.target.value.toUpperCase())}
                  placeholder="e.g. DBMS3A26"
                  className="h-9 w-full rounded-lg border border-input bg-card px-3 font-mono text-sm uppercase outline-none focus-visible:border-ring"
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={isJoining}
                  className="w-full gap-1.5 shadow-sm"
                >
                  <Plus className="size-3.5" />
                  {isJoining ? 'Joining Class…' : 'Join Class'}
                </Button>
              </form>
            </div>

            {/* Enrolled Classes List */}
            <div className="md:col-span-2 space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Enrolled Classes ({enrolledClasses.length})
              </h4>
              <div className="grid gap-3 sm:grid-cols-2">
                {enrolledClasses.map((cls) => (
                  <div
                    key={cls.id}
                    className="flex flex-col justify-between rounded-xl border border-border bg-card p-3.5 shadow-xs transition-colors hover:border-primary/40"
                  >
                    <div className="space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <h5 className="font-semibold text-sm text-foreground">{cls.name}</h5>
                        <Badge variant="outline" className="text-[10px] font-mono shrink-0">
                          {cls.classCode}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{cls.subject || 'Computer Science'}</p>
                    </div>
                    <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-2 text-[11px] text-muted-foreground">
                      <span>Teacher: {cls.teacherName || 'Dr. Priya Menon'}</span>
                      <Badge variant="default" className="text-[10px]">
                        Enrolled
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Hero Continue Learning Card */}
      <Card className="border-primary/40 bg-gradient-to-br from-primary/10 via-background to-chart-2/5 shadow-sm">
        <CardContent className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="default" className="text-xs">
                Active Assigned Learning Pathway
              </Badge>
              <LevelBadge level={currentStudent.level} />
              <Badge variant="outline" className="text-xs font-mono">
                Assigned by Teacher
              </Badge>
            </div>
            <h2 className="font-display text-2xl font-bold tracking-tight text-foreground">
              {isDBMS
                ? 'ER Model — Entity, Attribute & Cardinality Constraints'
                : 'Trigonometric Identities — Foundations Track'}
            </h2>
            <p className="max-w-xl text-sm text-muted-foreground text-pretty">
              {isDBMS
                ? 'Master Crow’s Foot and Chen notation, 1:1, 1:N, and M:N cardinality, and relational table mapping with interactive demonstrations.'
                : 'Your last check showed a slight gap in unit circle Pythagorean derivations. This 15-minute interactive lesson will get you right back on track.'}
            </p>
            <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
              <span className="flex items-center gap-1">
                <Clock className="size-3.5" /> 15 min estimated
              </span>
              <span>•</span>
              <span>3 interactive steps + 1 check quiz</span>
            </div>
          </div>

          <div className="flex flex-col gap-2 shrink-0">
            <Link href={`/student/learning?topic=${encodeURIComponent(selectedTopic)}`}>
              <Button size="lg" className="w-full gap-2 shadow-md sm:w-auto">
                <Play className="size-4 fill-current" />
                Continue Adaptive Lesson
              </Button>
            </Link>
            <Link href="/student/quizzes">
              <Button size="sm" variant="outline" className="w-full gap-1.5 sm:w-auto">
                Take Formative Quiz
                <ArrowRight className="size-3.5" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Metric Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Overall Topic Mastery"
          value={`${currentStudent.overallScore}%`}
          icon={TrendingUp}
          trend={{ value: '+6% this week', up: true }}
          tone="primary"
        />
        <StatCard
          label="Assigned Track Level"
          value={currentStudent.level}
          icon={Boxes}
          trend={{ value: 'Auto-adapted by AI', up: true }}
          tone="primary"
        />
        <StatCard
          label="Quizzes Completed"
          value={studentQuizResults.length}
          icon={CheckCircle2}
          trend={{ value: 'Latest: 85%', up: true }}
          tone="success"
        />
        <StatCard
          label="Learning Streak"
          value={`${studentUser.streak} Days`}
          icon={Flame}
          trend={{ value: 'Personal best!', up: true }}
          tone="warning"
        />
      </div>

      {/* Progress & Recommendations Split Grid */}
      <div className="grid gap-6 lg:grid-cols-7">
        {/* Mastery Progression */}
        <Card className="lg:col-span-4">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-0.5">
              <CardTitle className="text-base font-semibold">
                Topic Mastery Breakdown
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Live mastery scores across curriculum units
              </p>
            </div>
            <Link href="/student/progress">
              <Button variant="ghost" size="xs" className="gap-1 text-xs text-primary">
                Full analytics
                <ArrowRight className="size-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-3 pt-4">
            {currentStudent.topicMastery.map((tm) => (
              <div key={tm.topic} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-foreground">{tm.topic}</span>
                  <span className="font-mono text-muted-foreground">{tm.mastery}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary transition-all duration-500"
                    style={{ width: `${tm.mastery}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Formative Quizzes & Recent Results */}
        <Card className="lg:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-0.5">
              <CardTitle className="text-base font-semibold">
                Recent Assessments
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Check quizzes & diagnostic feedback
              </p>
            </div>
            <Link href="/student/quizzes">
              <Button variant="ghost" size="xs" className="gap-1 text-xs text-primary">
                View all
                <ArrowRight className="size-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-3 pt-2">
            {studentQuizResults.slice(0, 3).map((qr) => (
              <div
                key={qr.id}
                className="flex items-center justify-between rounded-xl border border-border p-3 transition-colors hover:bg-muted/30"
              >
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold text-foreground">{qr.title}</p>
                  <p className="text-[11px] text-muted-foreground">{qr.date}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={qr.score >= 70 ? 'success' : 'warning'}
                    className="font-mono text-xs"
                  >
                    {qr.score}%
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Recommended Next Steps */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lightbulb className="size-5 text-primary" />
            <h3 className="font-display text-lg font-bold">Personalized AI Interventions</h3>
          </div>
          <Link href="/student/recommendations">
            <Button variant="ghost" size="xs" className="gap-1 text-xs text-primary">
              All recommendations
              <ArrowRight className="size-3" />
            </Button>
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {studentRecommendations.slice(0, 2).map((rec) => (
            <RecommendationCard key={rec.id} rec={rec} mode="student" />
          ))}
        </div>
      </div>
    </div>
  )
}
