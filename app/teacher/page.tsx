'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Boxes,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  FileCheck2,
  FileText,
  GraduationCap,
  Lightbulb,
  Plus,
  Rocket,
  RotateCcw,
  School,
  Sparkles,
  TrendingUp,
  Upload,
  Users,
  Zap,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { StatCard } from '@/components/shared/stat-card'
import { BarChart, LineChart } from '@/components/shared/charts'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAppSession } from '@/lib/session-context'
import { classTrend, dashboardStats, teacher } from '@/lib/mock-data'

interface TeacherClass {
  id: string
  name: string
  classCode: string
  subject?: string
  studentCount: number
}

export default function TeacherDashboard() {
  const {
    students,
    topicMastery,
    activityFeed,
    insightsList,
    selectedTopic,
    approvalStatuses,
    resetToDefaults,
  } = useAppSession()

  const [classes, setClasses] = React.useState<TeacherClass[]>([
    {
      id: 'cls-1',
      name: 'DBMS - III CSE A',
      classCode: 'DBMS3A26',
      subject: 'Database Management Systems',
      studentCount: 32,
    },
  ])
  const [showCreateModal, setShowCreateModal] = React.useState(false)
  const [newClassName, setNewClassName] = React.useState('')
  const [newClassSubject, setNewClassSubject] = React.useState('Computer Science')
  const [isCreatingClass, setIsCreatingClass] = React.useState(false)
  const [copiedCode, setCopiedCode] = React.useState<string | null>(null)

  // Fetch classes on mount
  React.useEffect(() => {
    fetch('/api/classes')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.success && data.classes?.length > 0) {
          setClasses(data.classes)
        }
      })
      .catch(() => {})
  }, [])

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newClassName.trim()) return
    setIsCreatingClass(true)

    try {
      const res = await fetch('/api/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newClassName.trim(),
          subject: newClassSubject.trim(),
        }),
      })
      const data = await res.json()
      if (data.success && data.class) {
        setClasses((prev) => [data.class, ...prev])
        setNewClassName('')
        setShowCreateModal(false)
      }
    } catch (err) {
      console.error('Failed to create class', err)
    } finally {
      setIsCreatingClass(false)
    }
  }

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  // Calculate live stats
  const totalStudents = students.length
  const avgPerformance = Math.round(
    students.reduce((acc, s) => acc + s.overallScore, 0) / students.length,
  )
  const atRiskCount = students.filter(
    (s) => s.status === 'At Risk' || s.status === 'Needs Attention',
  ).length

  return (
    <div className="space-y-8">
      {/* Header with Welcome and Quick Actions */}
      <PageHeader
        title={`Welcome back, ${teacher.name}`}
        description={`${teacher.className} · ${teacher.subject} · M. Kumarasamy College of Engineering (MKCE)`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={resetToDefaults}
              className="gap-1.5 text-xs text-muted-foreground"
              title="Reset session to default demo state"
            >
              <RotateCcw className="size-3.5" />
              Reset Demo Data
            </Button>
            <Link href="/teacher/materials">
              <Button size="sm" variant="outline" className="gap-1.5">
                <Upload className="size-4" />
                Upload Material
              </Button>
            </Link>
            <Link href="/teacher/adaptive">
              <Button size="sm" className="gap-1.5 shadow-sm">
                <Sparkles className="size-4" />
                Adaptive Generator
              </Button>
            </Link>
          </div>
        }
      />

      {/* Key Metric Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Students"
          value={totalStudents}
          icon={Users}
          trend={{ value: `${totalStudents} enrolled`, up: true }}
          tone="primary"
        />
        <StatCard
          label="Avg Class Performance"
          value={`${avgPerformance}%`}
          icon={TrendingUp}
          trend={{ value: '+4% overall gain', up: true }}
          tone="success"
        />
        <StatCard
          label="Active Curriculum Topic"
          value={selectedTopic}
          icon={BookOpen}
          trend={{
            value: `Status: ${approvalStatuses[selectedTopic] || 'Approved'}`,
            up: true,
          }}
          tone="primary"
        />
        <StatCard
          label="At-Risk Learners"
          value={atRiskCount}
          icon={AlertTriangle}
          trend={{ value: 'Interventions recommended', up: false }}
          tone={atRiskCount > 2 ? 'destructive' : 'warning'}
        />
      </div>

      {/* TEACHER CLASS MANAGEMENT SECTION */}
      <Card className="border-border shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <School className="size-5 text-primary" />
              <CardTitle className="text-lg font-bold">My Classes</CardTitle>
            </div>
            <p className="text-xs text-muted-foreground">
              Manage your teaching sections and share unique class codes with students for instant enrollment.
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => setShowCreateModal(!showCreateModal)}
            className="gap-1.5 shadow-sm"
          >
            <Plus className="size-4" />
            Create Class
          </Button>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Create Class Inline Form */}
          {showCreateModal && (
            <form
              onSubmit={handleCreateClass}
              className="rounded-xl border border-primary/40 bg-primary/[0.03] p-4 space-y-3 animate-in fade-in"
            >
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-foreground">Create New Teaching Section</h4>
                <Badge variant="outline" className="text-[10px]">Auto-generates Code</Badge>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Class Name</label>
                  <input
                    type="text"
                    required
                    value={newClassName}
                    onChange={(e) => setNewClassName(e.target.value)}
                    placeholder="e.g. Data Structures - II CSE B"
                    className="h-9 w-full rounded-lg border border-input bg-card px-3 text-sm outline-none focus-visible:border-ring"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Subject</label>
                  <input
                    type="text"
                    value={newClassSubject}
                    onChange={(e) => setNewClassSubject(e.target.value)}
                    placeholder="e.g. Computer Science"
                    className="h-9 w-full rounded-lg border border-input bg-card px-3 text-sm outline-none focus-visible:border-ring"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isCreatingClass}>
                  {isCreatingClass ? 'Generating…' : 'Create & Generate Code'}
                </Button>
              </div>
            </form>
          )}

          {/* Classes Cards Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {classes.map((cls) => (
              <div
                key={cls.id}
                className="flex flex-col justify-between rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/40 hover:shadow-sm"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-semibold text-sm text-foreground">{cls.name}</h4>
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      {cls.studentCount} Students
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{cls.subject || 'Computer Science'}</p>
                </div>

                <div className="mt-4 flex items-center justify-between rounded-lg bg-muted/50 p-2.5">
                  <div className="space-y-0.5">
                    <p className="text-[10px] uppercase font-semibold text-muted-foreground">Class Code</p>
                    <p className="font-mono text-sm font-bold text-primary tracking-wider">{cls.classCode}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => copyToClipboard(cls.classCode)}
                    className="gap-1 text-xs"
                    title="Copy class code"
                  >
                    {copiedCode === cls.classCode ? (
                      <>
                        <Check className="size-3 text-success" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="size-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Complete End-to-End Hackathon Workflow Banner */}
      <Card className="border-primary/40 bg-gradient-to-r from-primary/10 via-card to-chart-2/10 shadow-sm">
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="default" className="text-xs">
                Complete MVP Flow
              </Badge>
              <h3 className="font-display text-base font-bold text-foreground">
                Teach → Assess → Analyze → Adapt → Recommend Loop
              </h3>
            </div>
            <p className="text-xs text-muted-foreground text-pretty max-w-2xl">
              1. Upload/Select DBMS material → 2. AI Concept Analysis → 3. Generate 3-Tier Adaptive Tracks → 4. Teacher Verification & Approval → 5. Student Learning & Quiz → 6. Live Updated Analytics.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Link href="/teacher/materials">
              <Button size="sm" className="gap-1.5 shadow-sm">
                Start Demo Flow
                <ArrowRight className="size-4" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Charts Row: Class Performance Trend & Topic Mastery Overview */}
      <div className="grid gap-6 lg:grid-cols-7">
        {/* Class Performance Line Chart */}
        <Card className="lg:col-span-4">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-0.5">
              <CardTitle className="text-base font-semibold">
                Class Performance Trend
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Average weekly assessment score progression (7-week rolling window)
              </p>
            </div>
            <Badge variant="outline" className="text-xs font-mono">
              Avg: {avgPerformance}%
            </Badge>
          </CardHeader>
          <CardContent className="pt-4">
            <LineChart
              data={classTrend.data}
              labels={classTrend.labels}
              height={220}
              tone="var(--color-primary)"
              showArea
            />
          </CardContent>
        </Card>

        {/* Topic Mastery Bar Chart */}
        <Card className="lg:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-0.5">
              <CardTitle className="text-base font-semibold">Topic Mastery</CardTitle>
              <p className="text-xs text-muted-foreground">
                Live mastery % by unit (updates after student quizzes)
              </p>
            </div>
            <Link href="/teacher/analytics">
              <Button variant="ghost" size="xs" className="gap-1 text-xs text-primary">
                View detail
                <ArrowRight className="size-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="pt-4">
            <BarChart
              data={topicMastery}
              height={220}
              tone="var(--color-chart-2)"
            />
          </CardContent>
        </Card>
      </div>

      {/* Critical AI Insights & Recent Activity Split Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Real-Time AI Insights & Alerts */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="size-5 text-primary" />
              <CardTitle className="text-base font-semibold">
                AI Diagnostic Insights
              </CardTitle>
            </div>
            <Link href="/teacher/recommendations">
              <Button variant="ghost" size="xs" className="text-xs text-primary">
                All recommendations
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-3 pt-2">
            {insightsList.slice(0, 4).map((ins) => {
              const severityStyles = {
                critical: 'border-destructive/30 bg-destructive/5 text-destructive',
                warning: 'border-warning/30 bg-warning/5 text-warning-foreground',
                info: 'border-primary/20 bg-primary/5 text-foreground',
              }
              const badgeVariant = {
                critical: 'destructive' as const,
                warning: 'warning' as const,
                info: 'default' as const,
              }
              return (
                <div
                  key={ins.id}
                  className={`flex items-start justify-between gap-3 rounded-xl border p-3.5 transition-colors ${severityStyles[ins.severity]}`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={badgeVariant[ins.severity]} className="text-[10px] uppercase">
                        {ins.severity}
                      </Badge>
                      <span className="text-xs text-muted-foreground">Automated alert</span>
                    </div>
                    <p className="text-sm font-medium leading-snug">{ins.message}</p>
                  </div>
                  <Link href="/teacher/recommendations">
                    <Button variant="outline" size="xs" className="shrink-0 gap-1 text-xs">
                      Resolve <ArrowRight className="size-3" />
                    </Button>
                  </Link>
                </div>
              )
            })}
          </CardContent>
        </Card>

        {/* Real-Time Pedagogical Activity Stream */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex items-center gap-2">
              <Clock className="size-5 text-primary" />
              <CardTitle className="text-base font-semibold">
                Live Pedagogical Stream
              </CardTitle>
            </div>
            <Badge variant="outline" className="text-xs">
              Live updates
            </Badge>
          </CardHeader>
          <CardContent className="space-y-3 pt-2">
            {activityFeed.slice(0, 5).map((act) => (
              <div
                key={act.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-border/80 bg-card p-3 transition-colors hover:bg-muted/40"
              >
                <div className="space-y-0.5">
                  <p className="text-sm font-medium text-foreground">{act.title}</p>
                  <p className="text-xs text-muted-foreground">{act.detail}</p>
                </div>
                <span className="shrink-0 text-xs font-mono text-muted-foreground">
                  {act.time}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
