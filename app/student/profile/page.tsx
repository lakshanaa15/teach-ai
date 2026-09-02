'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  Award,
  BookOpen,
  CheckCircle2,
  Clock,
  Edit3,
  Flame,
  GraduationCap,
  Mail,
  RotateCcw,
  Sparkles,
  Target,
  TrendingUp,
  User,
  Zap,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { LevelBadge, StatusBadge } from '@/components/shared/badges'
import { StatCard } from '@/components/shared/stat-card'
import { useAppSession } from '@/lib/session-context'
import { useToast } from '@/components/shared/toast'

export default function StudentProfilePage() {
  const { toast } = useToast()
  const { students, studentUser, studentQuizResults, selectedTopic } = useAppSession()
  const student = students[0] // Alex Rivera

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header */}
      <PageHeader
        title="Student Profile & Academic Record"
        description="View your learning profile, cognitive level status, curriculum history, and active AI personalized goals."
        actions={
          <div className="flex items-center gap-2">
            <Link href="/student/progress">
              <Button size="sm" variant="outline" className="gap-1.5 text-xs">
                <TrendingUp className="size-4" />
                View Full Analytics
              </Button>
            </Link>
          </div>
        }
      />

      {/* Profile Card Header */}
      <Card className="border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Avatar name={studentUser.name} className="size-16 ring-4 ring-primary/20 text-xl font-bold" />
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-2xl font-bold text-foreground">
                  {studentUser.name}
                </h2>
                <LevelBadge level={studentUser.level} />
                <StatusBadge status={student.status} />
              </div>
              <p className="text-xs text-muted-foreground">
                Grade 10 · {studentUser.email} · Class: <strong>Grade 10 · Advanced Track</strong>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                toast({
                  title: 'Profile preferences updated',
                  description: 'Saved learning style & difficulty preferences.',
                })
              }
              className="gap-1.5 text-xs"
            >
              <Edit3 className="size-3.5" />
              Edit Preferences
            </Button>
          </div>
        </div>
      </Card>

      {/* Stats Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Learning Streak"
          value={`${studentUser.streak} Days`}
          icon={Flame}
          trend={{ value: 'Active today', up: true }}
          tone="warning"
        />
        <StatCard
          label="Overall Subject Mastery"
          value={`${student.overallScore}%`}
          icon={TrendingUp}
          trend={{ value: 'Top 25% of class', up: true }}
          tone="success"
        />
        <StatCard
          label="Curriculum Progress"
          value={`${student.progress}%`}
          icon={Target}
          trend={{ value: 'Module 7 / 10', up: true }}
          tone="primary"
        />
        <StatCard
          label="Quizzes Taken"
          value={studentQuizResults.length}
          icon={CheckCircle2}
          trend={{ value: `Avg: ${student.overallScore}%`, up: true }}
          tone="primary"
        />
      </div>

      {/* Strengths and Weak Areas Grid */}
      <div className="grid gap-6 sm:grid-cols-2">
        {/* Strengths */}
        <Card className="border-success/30 bg-success/[0.02]">
          <CardHeader className="pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4.5 text-success" />
              <CardTitle className="text-base font-semibold">Demonstrated Strengths</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-4">
            {student.strengths.map((str) => (
              <div
                key={str}
                className="flex items-center justify-between rounded-lg border border-success/20 bg-card p-3 text-xs"
              >
                <div>
                  <p className="font-semibold text-foreground">{str}</p>
                  <p className="text-[11px] text-muted-foreground">High accuracy on formative checks</p>
                </div>
                <Badge variant="success" className="text-[10px]">
                  Mastered
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Identified Gaps */}
        <Card className="border-warning/30 bg-warning/[0.02]">
          <CardHeader className="pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <AlertTriangle className="size-4.5 text-warning-foreground" />
              <CardTitle className="text-base font-semibold">Active Learning Gaps</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-4">
            {student.weakTopics.map((wt) => (
              <div
                key={wt}
                className="flex items-center justify-between rounded-lg border border-warning/20 bg-card p-3 text-xs"
              >
                <div>
                  <p className="font-semibold text-foreground">{wt}</p>
                  <p className="text-[11px] text-muted-foreground">Actionable remedial track recommended</p>
                </div>
                <Link href={`/student/learning?topic=${encodeURIComponent(selectedTopic)}`}>
                  <Button size="xs" variant="outline" className="text-[11px] gap-1">
                    <Sparkles className="size-3" />
                    Study
                  </Button>
                </Link>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Learning History Timeline */}
      <Card>
        <CardHeader className="border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <Clock className="size-5 text-muted-foreground" />
            <CardTitle className="text-base font-semibold">Live Assessment & Study Activity</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="divide-y divide-border/60 p-0">
          {studentQuizResults.slice(0, 4).map((q) => (
            <div key={q.id} className="flex items-center justify-between p-4 text-xs">
              <div>
                <p className="font-semibold text-foreground">Completed: {q.title}</p>
                <p className="text-[11px] text-muted-foreground">{q.date} · Score: {q.score}%</p>
              </div>
              <Badge variant={q.score >= 75 ? 'success' : 'warning'} className="font-mono">
                +{Math.round(q.score / 10)} XP
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
