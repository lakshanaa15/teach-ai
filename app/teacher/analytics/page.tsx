'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  BookOpen,
  CheckCircle2,
  Clock,
  GraduationCap,
  Lightbulb,
  Sparkles,
  TrendingDown,
  TrendingUp,
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
import { classTrend, recentQuizPerformance } from '@/lib/mock-data'
import { useToast } from '@/components/shared/toast'

export default function AnalyticsPage() {
  const { toast } = useToast()
  const { students, topicMastery, selectedTopic } = useAppSession()

  const avgMastery =
    students.length > 0
      ? Math.round(students.reduce((acc, s) => acc + s.overallScore, 0) / students.length)
      : 0

  const learningGaps = [
    {
      topic: 'ER Model: Cardinality & Junction Tables',
      studentsAffected: 8,
      severity: 'Critical' as const,
      misconception: 'Foreign key placement in Many-to-Many relationships and weak entity identification',
      action: 'Assign Remedial Track: Noun/Verb ER Modeling & Junction Table Decomposition',
    },
    {
      topic: 'Trigonometric Identities',
      studentsAffected: 8,
      severity: 'Critical' as const,
      misconception: 'Confusing sin²θ with sin(θ²) and improper sign substitution on unit circle',
      action: 'Assign Remedial Track: Foundations of Pythagorean Identities',
    },
    {
      topic: 'Functions & Composition',
      studentsAffected: 5,
      severity: 'Warning' as const,
      misconception: 'Order of operations in nested f(g(x)) functions',
      action: 'Distribute 5-question visual composition warm-up',
    },
    {
      topic: 'Geometry — Circle Theorems',
      studentsAffected: 4,
      severity: 'Warning' as const,
      misconception: 'Angle subtended at center vs circumference',
      action: 'Attach interactive GeoGebra diagram to classroom feed',
    },
  ]

  const atRiskStudents = students.filter((s) => s.status === 'At Risk' || s.status === 'Needs Attention')

  return (
    <div className="space-y-8">
      {/* Header */}
      <PageHeader
        title="Curriculum & Learning Gap Analytics"
        description="Deep-dive into class-wide cognitive gaps, topic retention curves, formative quiz results, and automated intervention tracking."
        actions={
          <div className="flex items-center gap-2">
            <Link href="/teacher/recommendations">
              <Button size="sm" className="gap-1.5 shadow-sm">
                <Lightbulb className="size-4" />
                Intervention Center
              </Button>
            </Link>
          </div>
        }
      />

      {/* Overview Stat Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Class Average Mastery"
          value={`${avgMastery}%`}
          icon={TrendingUp}
          trend={{ value: '+4% overall gain', up: true }}
          tone="success"
        />
        <StatCard
          label="Critical Gaps Detected"
          value={learningGaps.length}
          icon={AlertTriangle}
          trend={{ value: 'ER Model & Trig are priorities', up: false }}
          tone="destructive"
        />
        <StatCard
          label="Assessment Completion"
          value="91%"
          icon={CheckCircle2}
          trend={{ value: '29/32 completed latest check', up: true }}
          tone="primary"
        />
        <StatCard
          label="At-Risk Learners"
          value={atRiskStudents.length}
          icon={Users}
          trend={{ value: `${atRiskStudents.length} receiving remedial tracks`, up: true }}
          tone="warning"
        />
      </div>

      {/* Main Charts: 7-Week Progression vs Topic Mastery */}
      <div className="grid gap-6 lg:grid-cols-7">
        {/* Line Chart */}
        <Card className="lg:col-span-4">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-0.5">
              <CardTitle className="text-base font-semibold">
                Class Performance Progression (7-Week Window)
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Continuous rolling average across formative and summative quizzes
              </p>
            </div>
            <Badge variant="outline" className="text-xs font-mono">
              +12 pts growth
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

        {/* Bar Chart: Topic Mastery */}
        <Card className="lg:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-0.5">
              <CardTitle className="text-base font-semibold">
                Live Topic Mastery Comparison
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Percentage of students passing 70% threshold (updates with student quizzes)
              </p>
            </div>
            <Badge variant="destructive" className="text-xs">
              ER Model & Trig Focus
            </Badge>
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

      {/* Granular Learning Gaps Deep Dive Table */}
      <Card className="border-border shadow-sm">
        <CardHeader className="flex flex-col gap-2 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
              <AlertTriangle className="size-5" />
            </div>
            <div>
              <CardTitle className="text-base font-bold">
                Identified Learning Gaps & Misconceptions
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                TeachAI analyzes incorrect answer choices in quizzes to uncover cognitive misconceptions.
              </p>
            </div>
          </div>
          <Badge variant="outline" className="text-xs">
            4 active gaps
          </Badge>
        </CardHeader>

        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {learningGaps.map((gap) => {
              const severityBadge = {
                Critical: 'destructive' as const,
                Warning: 'warning' as const,
                Low: 'default' as const,
              }
              return (
                <div
                  key={gap.topic}
                  className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between transition-colors hover:bg-muted/20"
                >
                  <div className="space-y-1 sm:max-w-xl">
                    <div className="flex items-center gap-2">
                      <Badge variant={severityBadge[gap.severity]} className="text-[10px] uppercase">
                        {gap.severity}
                      </Badge>
                      <h4 className="font-semibold text-foreground text-sm">{gap.topic}</h4>
                      <span className="text-xs text-muted-foreground">
                        ({gap.studentsAffected} students affected)
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">Detected Friction: </span>
                      {gap.misconception}
                    </p>
                    <p className="text-xs text-primary font-medium flex items-center gap-1">
                      <Sparkles className="size-3" />
                      Recommended Action: {gap.action}
                    </p>
                  </div>

                  <Link href={`/teacher/recommendations?topic=${encodeURIComponent(gap.topic)}`}>
                    <Button size="sm" variant="outline" className="gap-1.5 text-xs shrink-0">
                      Deploy Remediation
                      <ArrowRight className="size-3.5" />
                    </Button>
                  </Link>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* At-Risk Student Interventions List & Recent Quizzes */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* At-Risk Student Interventions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Users className="size-5 text-warning-foreground" />
              <CardTitle className="text-base font-semibold">
                Priority Interventions
              </CardTitle>
            </div>
            <Link href="/teacher/students">
              <Button variant="ghost" size="xs" className="text-xs text-primary">
                All students
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-3 pt-4">
            {atRiskStudents.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground border border-dashed rounded-lg">
                No students currently require priority interventions in this class.
              </div>
            ) : (
              atRiskStudents.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3 text-xs"
                >
                  <div>
                    <p className="font-semibold text-foreground">{s.name}</p>
                    <p className="text-muted-foreground">
                      Score: <strong className="text-foreground">{s.overallScore}%</strong> · Weak in{' '}
                      {s.weakTopics.join(', ')}
                    </p>
                  </div>
                  <Button
                    size="xs"
                    onClick={() =>
                      toast({
                        title: `Intervention scheduled for ${s.name}`,
                        description: 'Remedial track and 1-on-1 support dispatched.',
                      })
                    }
                    className="gap-1 text-xs shrink-0"
                  >
                    <Sparkles className="size-3" />
                    Intervene
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Recent Quiz Performance Chart */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <BarChart3 className="size-5 text-primary" />
              <CardTitle className="text-base font-semibold">
                Formative Assessment Trend
              </CardTitle>
            </div>
            <Badge variant="outline" className="text-xs">
              Rolling History
            </Badge>
          </CardHeader>
          <CardContent className="pt-4">
            <BarChart
              data={recentQuizPerformance}
              height={180}
              tone="var(--color-primary)"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
