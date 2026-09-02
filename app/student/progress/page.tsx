'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle2,
  Clock,
  Flame,
  GraduationCap,
  Lightbulb,
  Sparkles,
  Target,
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
import { useAppSession } from '@/lib/session-context'

export default function StudentProgressPage() {
  const { students, selectedTopic } = useAppSession()
  const student = students[0] // Alex Rivera

  return (
    <div className="space-y-8">
      {/* Header */}
      <PageHeader
        title="My Learning Progress & Live Gap Diagnostic"
        description="Track your topic mastery, exam growth curves, identified cognitive hurdles, and personalized milestones in real time."
        actions={
          <div className="flex items-center gap-2">
            <Link href="/student/recommendations">
              <Button size="sm" className="gap-1.5 shadow-sm">
                <Lightbulb className="size-4" />
                View Recommended Actions
              </Button>
            </Link>
          </div>
        }
      />

      {/* Top Stats Overview */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Overall Mastery Score"
          value={`${student.overallScore}%`}
          icon={TrendingUp}
          trend={{ value: '+4% overall gain', up: true }}
          tone="success"
        />
        <StatCard
          label="Syllabus Completion"
          value={`${student.progress}%`}
          icon={Target}
          trend={{ value: 'Module 7 of 10', up: true }}
          tone="primary"
        />
        <StatCard
          label="Active Learning Gaps"
          value={student.weakTopics.length}
          icon={AlertTriangle}
          trend={{ value: `${student.weakTopics.length} need practice`, up: false }}
          tone={student.weakTopics.length > 0 ? 'warning' : 'success'}
        />
        <StatCard
          label="Strengths Unlocked"
          value={student.strengths.length}
          icon={Award}
          trend={{ value: 'Algebra & Linear Functions', up: true }}
          tone="primary"
        />
      </div>

      {/* Active Learning Gap Diagnostic Banner */}
      {student.weakTopics.length > 0 && (
        <Card className="border-warning/40 bg-warning/[0.04] p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3.5">
              <div className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl bg-warning/20 text-warning-foreground">
                <AlertTriangle className="size-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="warning" className="text-xs font-semibold">
                    Detected Learning Gaps ({student.weakTopics.length})
                  </Badge>
                  <span className="text-xs text-muted-foreground">{student.weakTopics.join(' · ')}</span>
                </div>
                <h3 className="font-semibold text-foreground text-sm">
                  Cognitive Hurdle: Concept Scaffolding Recommended
                </h3>
                <p className="text-xs text-muted-foreground max-w-2xl text-pretty">
                  Based on your latest assessment submission, reviewing the 15-minute foundational track will close open conceptual gaps and raise your mastery to 85%+.
                </p>
              </div>
            </div>

            <Link href={`/student/learning?topic=${encodeURIComponent(selectedTopic)}`}>
              <Button size="sm" className="gap-1.5 shadow-sm shrink-0">
                <BookOpen className="size-4" />
                Open Remedial Track
              </Button>
            </Link>
          </div>
        </Card>
      )}

      {/* Charts Grid: Progression Line Chart & Unit Mastery */}
      <div className="grid gap-6 lg:grid-cols-7">
        {/* Weekly Progression Line Chart */}
        <Card className="lg:col-span-4">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-0.5">
              <CardTitle className="text-base font-semibold">
                7-Week Assessment Progression
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Your weekly assessment scores over time
              </p>
            </div>
            <Badge variant="outline" className="text-xs font-mono">
              Current: {student.overallScore}%
            </Badge>
          </CardHeader>
          <CardContent className="pt-4">
            <LineChart
              data={student.performanceTrend}
              labels={['Wk 1', 'Wk 2', 'Wk 3', 'Wk 4', 'Wk 5', 'Wk 6', 'Wk 7']}
              height={220}
              tone="var(--color-primary)"
              showArea
            />
          </CardContent>
        </Card>

        {/* Topic Mastery Bars */}
        <Card className="lg:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-0.5">
              <CardTitle className="text-base font-semibold">Unit Mastery (Live)</CardTitle>
              <p className="text-xs text-muted-foreground">
                Comprehension percentage by curriculum domain
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-4">
            {student.topicMastery.map((tm) => {
              const isWeak = tm.mastery < 60
              return (
                <div key={tm.topic} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className={`font-medium ${isWeak ? 'text-destructive font-bold' : 'text-foreground'}`}>
                      {tm.topic}
                    </span>
                    <span className={`font-bold ${isWeak ? 'text-destructive' : 'text-foreground'}`}>
                      {tm.mastery}%
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full transition-all duration-500 ${
                        tm.mastery >= 75
                          ? 'bg-success'
                          : tm.mastery >= 60
                            ? 'bg-primary'
                            : 'bg-destructive'
                      }`}
                      style={{ width: `${tm.mastery}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>

      {/* Strengths & Completed Achievements */}
      <div className="grid gap-6 sm:grid-cols-2">
        {/* Strengths */}
        <Card className="border-success/30 bg-success/[0.02]">
          <CardHeader className="pb-3 border-b border-border/60">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4.5 text-success" />
              <CardTitle className="text-sm font-semibold">Mastered Strengths</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-4">
            {student.strengths.map((str) => (
              <div key={str} className="flex items-center justify-between text-xs">
                <span className="font-medium text-foreground">{str}</span>
                <Badge variant="success" className="text-[10px]">
                  90%+ Accuracy
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Milestone Badges */}
        <Card className="border-primary/20 bg-primary/[0.02]">
          <CardHeader className="pb-3 border-b border-border/60">
            <div className="flex items-center gap-2">
              <Award className="size-4.5 text-primary" />
              <CardTitle className="text-sm font-semibold">Milestones Unlocked</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 pt-4">
            <div className="rounded-lg border border-border bg-card p-3 text-center">
              <span className="text-xl">🔥</span>
              <p className="mt-1 text-xs font-bold text-foreground">6-Day Streak</p>
              <p className="text-[10px] text-muted-foreground">Consistent daily practice</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-3 text-center">
              <span className="text-xl">⚡</span>
              <p className="mt-1 text-xs font-bold text-foreground">Adaptive Learner</p>
              <p className="text-[10px] text-muted-foreground">Completed formative tracks</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
