'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Award,
  BookOpen,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Flame,
  GraduationCap,
  Layers,
  Lightbulb,
  RotateCw,
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
import type { PersonalizedRevisionPlan } from '@/lib/types'
import { useToast } from '@/components/shared/toast'

export default function StudentProgressPage() {
  const { toast } = useToast()
  const { students, selectedTopic } = useAppSession()
  const student = students[0] // Alex Rivera

  // Personalized Revision Plan states
  const [selectedDuration, setSelectedDuration] = React.useState<number>(7)
  const [isGeneratingPlan, setIsGeneratingPlan] = React.useState(false)
  const [revisionPlan, setRevisionPlan] = React.useState<PersonalizedRevisionPlan | null>(null)
  const [insufficientDataMsg, setInsufficientDataMsg] = React.useState<string | null>(null)
  const [completedActivities, setCompletedActivities] = React.useState<Record<string, boolean>>({})

  const handleGenerateRevisionPlan = async (force = false) => {
    setIsGeneratingPlan(true)
    setInsufficientDataMsg(null)

    try {
      const res = await fetch('/api/revision-plans/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: selectedTopic || 'Database Normalization',
          durationDays: selectedDuration,
          forceGenerate: force,
        }),
      })

      const data = await res.json()

      if (data.insufficientData) {
        setInsufficientDataMsg(data.message)
        return
      }

      if (!res.ok || !data.success) {
        toast({
          title: 'Plan Generation Failed',
          description: data.error || 'Could not generate personalized revision plan.',
        })
        return
      }

      setRevisionPlan(data.revisionPlan)
      toast({
        title: 'Personalized Revision Plan Created! ✨',
        description: `Constructed ${data.revisionPlan.durationDays}-day schedule prioritizing your diagnosed learning gaps.`,
      })
    } catch (err) {
      toast({
        title: 'Network Error',
        description: err instanceof Error ? err.message : 'Could not contact revision service.',
      })
    } finally {
      setIsGeneratingPlan(false)
    }
  }

  const toggleActivityCompletion = (actId: string) => {
    setCompletedActivities((prev) => {
      const updated = { ...prev, [actId]: !prev[actId] }
      return updated
    })
  }

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
                  Based on your latest assessment submission, reviewing the foundational track will close open conceptual gaps and raise your mastery to 85%+.
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

      {/* REAL AI PERSONALIZED REVISION PLAN PANEL */}
      <Card className="border-2 border-primary/30 bg-card p-6 shadow-sm space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Calendar className="size-5" />
            </div>
            <div>
              <h3 className="font-display text-base font-bold text-foreground">
                Personalized AI Revision Plan
              </h3>
              <p className="text-xs text-muted-foreground">
                Evidence-grounded study roadmap prioritizing your diagnosed learning gaps and cognitive misconceptions.
              </p>
            </div>
          </div>

          {/* Duration Selector */}
          <div className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/30 p-1 self-start sm:self-auto">
            <span className="px-2 text-xs font-medium text-muted-foreground">Duration:</span>
            {[3, 5, 7, 14].map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => setSelectedDuration(days)}
                className={`rounded px-2.5 py-1 text-xs font-semibold transition-all ${
                  selectedDuration === days
                    ? 'bg-card text-foreground shadow-xs font-bold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {days}d
              </button>
            ))}
          </div>
        </div>

        {/* State A: Insufficient Data Alert */}
        {insufficientDataMsg && (
          <div className="rounded-xl border border-warning/30 bg-warning/[0.04] p-4 space-y-3 text-xs">
            <div className="flex items-center gap-2 font-bold text-warning-foreground">
              <AlertCircle className="size-4" />
              <span>Diagnostic Assessment Needed</span>
            </div>
            <p className="text-muted-foreground">{insufficientDataMsg}</p>
            <div className="flex gap-2 pt-1">
              <Link href={`/student/quizzes?topic=${encodeURIComponent(selectedTopic)}`}>
                <Button size="xs" className="gap-1">
                  Take Diagnostic Quiz
                  <ArrowRight className="size-3" />
                </Button>
              </Link>
              <Button
                size="xs"
                variant="outline"
                onClick={() => handleGenerateRevisionPlan(true)}
                className="text-xs"
              >
                Generate Plan Anyway
              </Button>
            </div>
          </div>
        )}

        {/* State B: Prompt Banner (when plan not yet generated) */}
        {!revisionPlan && !insufficientDataMsg && (
          <div className="rounded-xl bg-muted/20 border border-border p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="space-y-1">
                <h4 className="font-bold text-sm text-foreground">
                  Generate Your {selectedDuration}-Day Revision Strategy
                </h4>
                <p className="text-xs text-muted-foreground">
                  Current topic mastery: <strong>{student.overallScore}%</strong>. Gemini will analyze your quiz mistakes and structure daily 20-minute sessions focused on closing gaps before your next assessment.
                </p>
              </div>
              <Badge variant="outline" className="text-xs font-mono shrink-0 self-start sm:self-auto">
                Topic: {selectedTopic}
              </Badge>
            </div>

            {/* Priority Preview Badges */}
            <div className="space-y-1.5 pt-1 text-xs">
              <span className="font-semibold text-muted-foreground uppercase text-[10px]">
                Preliminary Priority Allocations:
              </span>
              <div className="flex flex-wrap gap-2">
                {student.weakTopics.map((wt) => (
                  <span
                    key={wt}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/30 bg-destructive/5 px-2.5 py-1 text-destructive font-medium"
                  >
                    🔴 High Priority: {wt}
                  </span>
                ))}
                {student.strengths.slice(0, 2).map((st) => (
                  <span
                    key={st}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-success/30 bg-success/5 px-2.5 py-1 text-success font-medium"
                  >
                    🟢 Maintenance: {st}
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-2">
              <Button
                onClick={() => handleGenerateRevisionPlan(false)}
                disabled={isGeneratingPlan}
                className="gap-2 shadow-sm font-semibold text-xs"
              >
                <Sparkles className={`size-4 ${isGeneratingPlan ? 'animate-spin' : ''}`} />
                {isGeneratingPlan ? 'Synthesizing with Gemini AI...' : 'Generate My Revision Plan'}
              </Button>
            </div>
          </div>
        )}

        {/* State C: Active Revision Plan Display */}
        {revisionPlan && (
          <div className="space-y-6 animate-in fade-in">
            {/* Plan Header Card */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between rounded-xl bg-primary/5 border border-primary/20 p-4 gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-sm text-foreground">{revisionPlan.title}</h4>
                  <Badge variant="default" className="text-xs">
                    {revisionPlan.recommendedTier} Level
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{revisionPlan.overallGoal}</p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() => handleGenerateRevisionPlan(true)}
                  disabled={isGeneratingPlan}
                  className="gap-1.5 text-xs text-primary"
                >
                  <RotateCw className={`size-3 ${isGeneratingPlan ? 'animate-spin' : ''}`} />
                  Regenerate Plan
                </Button>
              </div>
            </div>

            {/* Priority Areas Overview */}
            <div>
              <h5 className="font-bold text-xs uppercase tracking-wider text-muted-foreground mb-2.5">
                Targeted Revision Priorities
              </h5>
              <div className="grid gap-2.5 sm:grid-cols-2 md:grid-cols-3">
                {revisionPlan.priorityAreas.map((pa, idx) => (
                  <div
                    key={idx}
                    className={`rounded-xl border p-3 space-y-1 text-xs ${
                      pa.priority === 'High'
                        ? 'border-destructive/30 bg-destructive/[0.02]'
                        : pa.priority === 'Medium'
                          ? 'border-warning/30 bg-warning/[0.02]'
                          : 'border-success/30 bg-success/[0.02]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-foreground">{pa.concept}</span>
                      <Badge
                        variant={
                          pa.priority === 'High'
                            ? 'destructive'
                            : pa.priority === 'Medium'
                              ? 'warning'
                              : 'success'
                        }
                        className="text-[9px] py-0 px-1"
                      >
                        {pa.priority} Priority
                      </Badge>
                    </div>
                    <p className="text-muted-foreground text-[11px] leading-relaxed">{pa.reason}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Daily Schedule Cards */}
            <div className="space-y-3">
              <h5 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
                Day-by-Day Revision Roadmap ({revisionPlan.dailyPlans.length} Days)
              </h5>

              <div className="grid gap-4">
                {revisionPlan.dailyPlans.map((dp) => (
                  <div
                    key={dp.day}
                    className="rounded-xl border border-border bg-card p-4 space-y-3 text-xs shadow-2xs transition-all hover:border-primary/40"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-2.5 gap-2">
                      <div className="flex items-center gap-2">
                        <span className="flex size-6 items-center justify-center rounded-lg bg-primary/10 font-bold text-primary text-xs">
                          D{dp.day}
                        </span>
                        <span className="font-bold text-sm text-foreground">
                          {dp.focusConcepts.join(' · ')}
                        </span>
                        <Badge
                          variant={
                            dp.priority === 'High'
                              ? 'destructive'
                              : dp.priority === 'Medium'
                                ? 'warning'
                                : 'default'
                          }
                          className="text-[10px]"
                        >
                          {dp.priority} Priority
                        </Badge>
                      </div>

                      <span className="flex items-center gap-1 text-muted-foreground font-mono text-[11px]">
                        <Clock className="size-3" /> ~{dp.estimatedMinutes} mins
                      </span>
                    </div>

                    <p className="text-muted-foreground font-medium">{dp.goal}</p>

                    {/* Activities Checklist */}
                    <div className="space-y-2 pt-1">
                      {dp.activities.map((act, aIdx) => {
                        const actKey = `${dp.day}-${aIdx}`
                        const isDone = completedActivities[actKey] || false
                        return (
                          <div
                            key={aIdx}
                            className={`flex items-start justify-between gap-3 rounded-lg border p-2.5 transition-colors ${
                              isDone
                                ? 'border-success/30 bg-success/[0.04]'
                                : 'border-border bg-background'
                            }`}
                          >
                            <div className="flex items-start gap-2.5">
                              <button
                                type="button"
                                onClick={() => toggleActivityCompletion(actKey)}
                                className={`mt-0.5 flex size-4.5 shrink-0 items-center justify-center rounded border transition-colors ${
                                  isDone
                                    ? 'border-success bg-success text-success-foreground'
                                    : 'border-muted-foreground/40 hover:border-primary'
                                }`}
                              >
                                {isDone && <Check className="size-3 stroke-[3]" />}
                              </button>
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-[9px] py-0 px-1 font-mono">
                                    {act.type}
                                  </Badge>
                                  <span
                                    className={`font-semibold text-xs ${
                                      isDone ? 'line-through text-muted-foreground' : 'text-foreground'
                                    }`}
                                  >
                                    {act.title}
                                  </span>
                                </div>
                                <p className="text-[11px] text-muted-foreground">{act.description}</p>
                              </div>
                            </div>

                            {/* Direct link to practice */}
                            {act.type === 'Practice' && (
                              <Link
                                href={`/student/learning?topic=${encodeURIComponent(
                                  act.targetConcept || selectedTopic,
                                )}`}
                                className="shrink-0"
                              >
                                <Button size="xs" variant="outline" className="gap-1 text-[11px] h-7">
                                  Practice
                                  <ArrowRight className="size-3" />
                                </Button>
                              </Link>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Reassessment Banner */}
            {revisionPlan.reassessment?.recommended && (
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-primary">
                    <Award className="size-4" />
                    <span>Final Reassessment Recommended</span>
                  </div>
                  <p className="text-muted-foreground max-w-xl">
                    {revisionPlan.reassessment.reason} Focus areas:{' '}
                    <strong>{revisionPlan.reassessment.targetConcepts.join(', ')}</strong>.
                  </p>
                </div>

                <Link
                  href={`/student/quizzes?topic=${encodeURIComponent(
                    revisionPlan.reassessment.suggestedQuizTopic || selectedTopic,
                  )}`}
                  className="shrink-0"
                >
                  <Button size="sm" className="gap-1.5 shadow-sm font-semibold text-xs">
                    <Zap className="size-3.5" />
                    Take Reassessment Quiz
                  </Button>
                </Link>
              </div>
            )}
          </div>
        )}
      </Card>

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
