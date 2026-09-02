'use client'

import * as React from 'react'
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  Copy,
  Edit3,
  FileCheck2,
  FileText,
  Lightbulb,
  Play,
  RotateCw,
  Scale,
  Sparkles,
  Target,
  Upload,
  Users,
  Wand2,
  Zap,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DonutChart } from '@/components/shared/charts'
import { AILoading } from '@/components/shared/states'
import { sampleLessonPlan } from '@/lib/mock-data'
import { analyzeLessonPlan } from '@/lib/ai-service'
import type { LessonPlanScore } from '@/lib/types'
import { useToast } from '@/components/shared/toast'

export default function LessonPlansPage() {
  const { toast } = useToast()
  const [lessonText, setLessonText] = React.useState(sampleLessonPlan)
  const [isLoading, setIsLoading] = React.useState(false)
  const [scoreData, setScoreData] = React.useState<LessonPlanScore | null>(null)
  const [isImproved, setIsImproved] = React.useState(false)
  const [showImprovedModal, setShowImprovedModal] = React.useState(false)

  // Run initial analysis
  React.useEffect(() => {
    handleAnalyze()
  }, [])

  const handleAnalyze = async () => {
    setIsLoading(true)
    setIsImproved(false)
    try {
      const res = await analyzeLessonPlan()
      setScoreData(res)
    } finally {
      setIsLoading(false)
    }
  }

  const handleApplyAutoImprovement = () => {
    setIsImproved(true)
    setShowImprovedModal(true)
    if (scoreData) {
      setScoreData({
        overall: 96,
        verdict: 'Exceptional (Optimized)',
        breakdown: [
          { label: 'Learning Objectives', score: 98 },
          { label: 'Content Clarity', score: 95 },
          { label: 'Student Engagement', score: 92 },
          { label: 'Assessment Alignment', score: 97 },
          { label: 'Differentiation', score: 94 },
          { label: 'Time Management', score: 96 },
        ],
        strengths: [
          'Crystal-clear objective paired with 3 differentiated tier pathways',
          'Worked visual proofs embedded prior to independent practice',
          'Pair-share collaborative checkpoints increase active engagement',
          'Extension proofs provided for advanced early-finishers',
        ],
        issues: [],
        improvements: ['Lesson plan meets all pedagogical gold standards.'],
      })
    }
    toast({
      title: 'Lesson plan optimized',
      description: 'Differentiation branches and guided proof checkpoints injected.',
    })
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <PageHeader
        title="Lesson Plan Quality Checker"
        description="Paste or upload your draft curriculum. TeachAI evaluates objectives, clarity, engagement, assessment alignment, differentiation, and pacing across 6 pedagogical dimensions."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setLessonText(sampleLessonPlan)
                toast({ title: 'Sample lesson loaded', description: 'Trigonometric Identities plan ready.' })
              }}
              className="text-xs"
            >
              Load Sample Plan
            </Button>
            <Button
              onClick={handleAnalyze}
              disabled={isLoading || !lessonText.trim()}
              className="gap-2 shadow-sm"
            >
              <Sparkles className={`size-4 ${isLoading ? 'animate-spin' : ''}`} />
              Analyze Lesson Plan
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Column: Lesson Plan Editor / Input */}
        <div className="space-y-4 lg:col-span-5">
          <Card className="flex flex-col h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <FileText className="size-4 text-primary" />
                <CardTitle className="text-sm font-semibold">Lesson Plan Input</CardTitle>
              </div>
              <Badge variant="outline" className="text-[11px]">
                {lessonText.split(/\s+/).filter(Boolean).length} words
              </Badge>
            </CardHeader>

            <CardContent className="flex-1 space-y-4 pt-4">
              <textarea
                value={lessonText}
                onChange={(e) => setLessonText(e.target.value)}
                placeholder="Paste your lesson plan here or type out objectives, activities, and timings…"
                rows={16}
                className="w-full resize-none rounded-lg border border-input bg-card p-3.5 font-mono text-xs leading-relaxed outline-none transition-colors focus-visible:border-ring focus-visible:ring-2"
              />

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => {
                      setLessonText(
                        `Lesson: Introduction to Trigonometric Identities\n\nObjective: Students will recognize and apply the Pythagorean identity.\n\nWarm-up (5 min): Unit circle coordinates.\nDirect instruction (15 min): Derive sin²θ + cos²θ = 1.\nCollaborative Practice (15 min): Differentiated group problems (Remedial / Standard / Advanced).\nExit Ticket (10 min): 3 targeted check questions with immediate peer review.`,
                      )
                      toast({ title: 'Optimized template loaded' })
                    }}
                    className="text-xs"
                  >
                    Use Differentiated Template
                  </Button>
                </div>
                <Button
                  size="sm"
                  onClick={handleAnalyze}
                  disabled={isLoading}
                  className="gap-1 text-xs"
                >
                  <Sparkles className="size-3.5" />
                  Analyze
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: 6-Dimension Score and Recommendations */}
        <div className="space-y-6 lg:col-span-7">
          {isLoading ? (
            <AILoading
              label="Auditing lesson plan against pedagogical rubrics…"
              steps={[
                'Parsing learning objectives against Bloom’s Taxonomy…',
                'Checking assessment alignment with exit ticket…',
                'Measuring time allocations per cognitive phase…',
                'Auditing differentiation branches for struggling & advanced learners…',
              ]}
            />
          ) : scoreData ? (
            <div className="space-y-6">
              {/* Overall Quality Score Card */}
              <Card className="border-primary/40 shadow-sm">
                <CardContent className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-5">
                    <DonutChart
                      value={scoreData.overall}
                      size={96}
                      stroke={10}
                      tone={
                        scoreData.overall >= 85
                          ? 'var(--color-success)'
                          : scoreData.overall >= 70
                            ? 'var(--color-chart-1)'
                            : 'var(--color-warning)'
                      }
                      label={
                        <div className="text-center">
                          <span className="font-display text-2xl font-bold">{scoreData.overall}</span>
                          <span className="text-[10px] text-muted-foreground block leading-none">/ 100</span>
                        </div>
                      }
                    />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={scoreData.overall >= 85 ? 'success' : 'default'}
                          className="text-xs"
                        >
                          {scoreData.verdict}
                        </Badge>
                        <span className="text-xs text-muted-foreground">Pedagogical Index</span>
                      </div>
                      <h3 className="font-display text-xl font-bold">
                        {scoreData.overall >= 90
                          ? 'Exceptional Lesson Plan'
                          : scoreData.overall >= 75
                            ? 'Solid Plan — Needs Differentiation'
                            : 'Requires Structural Adjustments'}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {scoreData.overall >= 90
                          ? 'All 6 instructional dimensions meet high-engagement standards.'
                          : 'Strengthen differentiation and add worked examples before independent practice.'}
                      </p>
                    </div>
                  </div>

                  <Button
                    onClick={handleApplyAutoImprovement}
                    className="gap-2 shadow-sm shrink-0"
                  >
                    <Wand2 className="size-4" />
                    {isImproved ? 'View Improvements' : 'Improve Lesson Plan'}
                  </Button>
                </CardContent>
              </Card>

              {/* 6 Category Score Breakdown Grid */}
              <Card>
                <CardHeader className="pb-3 border-b border-border">
                  <CardTitle className="text-sm font-semibold">
                    6-Dimension Pedagogical Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 pt-4 sm:grid-cols-2">
                  {scoreData.breakdown.map((item) => {
                    const scoreColor =
                      item.score >= 85
                        ? 'bg-success text-success'
                        : item.score >= 70
                          ? 'bg-primary text-primary'
                          : 'bg-warning text-warning-foreground'
                    return (
                      <div key={item.label} className="space-y-1.5 rounded-lg border border-border bg-muted/20 p-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-foreground">{item.label}</span>
                          <span className="font-bold">{item.score}%</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className={`h-full transition-all duration-500 ${scoreColor}`}
                            style={{ width: `${item.score}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </CardContent>
              </Card>

              {/* Strengths & Issues Grid */}
              <div className="grid gap-6 sm:grid-cols-2">
                {/* Strengths */}
                <Card className="border-success/30 bg-success/[0.02]">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="size-4 text-success" />
                      <CardTitle className="text-sm font-semibold text-foreground">
                        Strengths ({scoreData.strengths.length})
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 pt-2">
                    {scoreData.strengths.map((str, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <span className="font-bold text-success">✓</span>
                        <span>{str}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Issues Detected */}
                <Card className="border-warning/30 bg-warning/[0.02]">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="size-4 text-warning-foreground" />
                      <CardTitle className="text-sm font-semibold text-foreground">
                        Issues Detected ({scoreData.issues.length})
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 pt-2">
                    {scoreData.issues.length > 0 ? (
                      scoreData.issues.map((iss, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                          <span className="font-bold text-warning-foreground">!</span>
                          <span>{iss}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-success font-medium">All issues successfully resolved!</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* AI Recommendations Panel */}
              <Card className="border-primary/20 bg-primary/[0.02]">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="size-4.5 text-primary" />
                    <CardTitle className="text-sm font-semibold text-foreground">
                      AI Actionable Improvements
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 pt-2">
                  {scoreData.improvements.map((rec, i) => (
                    <div key={i} className="flex items-start gap-2 rounded-lg bg-card p-2.5 border border-border text-xs">
                      <span className="flex size-4.5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                        {i + 1}
                      </span>
                      <span className="text-muted-foreground">{rec}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          ) : null}
        </div>
      </div>

      {/* Improved Lesson Plan Modal / Diff View */}
      {showImprovedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl animate-in zoom-in-95">
            <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-3 bg-muted/20">
              <div className="flex items-center gap-2">
                <Wand2 className="size-5 text-primary" />
                <CardTitle className="text-base font-bold">
                  AI-Optimized Lesson Plan
                </CardTitle>
                <Badge variant="success" className="text-xs">
                  Score: 96/100
                </Badge>
              </div>
              <Button variant="ghost" size="icon-sm" onClick={() => setShowImprovedModal(false)}>
                ✕
              </Button>
            </CardHeader>
            <CardContent className="space-y-4 pt-4 text-xs leading-relaxed">
              <div className="rounded-lg bg-success/10 p-3 border border-success/20 text-success">
                <strong>Improvements Applied:</strong> Integrated 3-tier differentiated tasks, added a scaffolded proof demo, and created collaborative peer check exit tickets.
              </div>

              <div className="rounded-lg border border-border bg-card p-4 space-y-3 font-mono">
                <p className="font-bold text-foreground">
                  Lesson: Introduction to Trigonometric Identities (Optimized)
                </p>
                <p>
                  <strong>Objectives:</strong> Students derive and apply sin²θ + cos²θ = 1 and 1 + tan²θ = sec²θ with 85%+ exit accuracy.
                </p>
                <p>
                  <strong>Segment 1 (5 min):</strong> Unit circle recall with visual diagram cheat sheet (Remedial support available).
                </p>
                <p>
                  <strong>Segment 2 (15 min):</strong> Step-by-step derivation with interactive worked examples and misconception alerts.
                </p>
                <p>
                  <strong>Segment 3 (15 min Differentiated Practice):</strong>
                  <br />• <em>Remedial track:</em> 4 scaffolded problems with formula hints.
                  <br />• <em>Standard track:</em> 6 mixed simplification problems.
                  <br />• <em>Advanced track:</em> Real-world physics wave harmonic proof.
                </p>
                <p>
                  <strong>Segment 4 (10 min):</strong> Formative Exit Ticket with immediate peer check and AI Tutor follow-up.
                </p>
              </div>

              <div className="flex justify-end gap-2 border-t border-border pt-4">
                <Button variant="outline" size="sm" onClick={() => setShowImprovedModal(false)}>
                  Close
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    setLessonText(
                      `Lesson: Introduction to Trigonometric Identities (Optimized)\n\nObjective: Students derive and apply sin²θ + cos²θ = 1 with 85%+ exit accuracy.\n\nSegment 1 (5 min): Unit circle recall with visual diagram cheat sheet.\nSegment 2 (15 min): Step-by-step derivation with worked examples.\nSegment 3 (15 min): 3-tier Differentiated Practice (Remedial / Standard / Advanced).\nSegment 4 (10 min): Formative Exit Ticket.`,
                    )
                    setShowImprovedModal(false)
                    toast({ title: 'Optimized plan copied to editor' })
                  }}
                  className="gap-1.5"
                >
                  <Copy className="size-4" />
                  Apply to Editor
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
