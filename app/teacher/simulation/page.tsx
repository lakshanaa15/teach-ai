'use client'

import * as React from 'react'
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  HelpCircle,
  Layers,
  Lightbulb,
  MessageSquare,
  Play,
  RefreshCw,
  Rocket,
  Sliders,
  Sparkles,
  UserCheck,
  Users,
  Wand2,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DonutChart } from '@/components/shared/charts'
import { AILoading } from '@/components/shared/states'
import { analyzeLesson, runStudentSimulation } from '@/lib/ai-service'
import { useAppSession } from '@/lib/session-context'
import type { LessonAnalysis, SimulatedStudent } from '@/lib/types'
import { useToast } from '@/components/shared/toast'

export default function SimulationPage() {
  const { toast } = useToast()
  const { selectedTopic, setSelectedTopic } = useAppSession()

  const [isLoading, setIsLoading] = React.useState(false)
  const [students, setStudents] = React.useState<SimulatedStudent[]>([])
  const [analysis, setAnalysis] = React.useState<LessonAnalysis | null>(null)
  const [isImproved, setIsImproved] = React.useState(false)

  // Run simulation on mount or topic change
  React.useEffect(() => {
    handleRunSimulation()
  }, [selectedTopic])

  const handleRunSimulation = async () => {
    setIsLoading(true)
    setIsImproved(false)
    try {
      const [simulatedData, analysisData] = await Promise.all([
        runStudentSimulation(selectedTopic),
        analyzeLesson(),
      ])
      setStudents(simulatedData)
      setAnalysis(analysisData)
    } finally {
      setIsLoading(false)
    }
  }

  const handleApplyImprovements = () => {
    if (!analysis) return
    setIsImproved(true)
    setAnalysis({
      ...analysis,
      effectiveness: 96,
      engagement: 91,
      confusingSections: ['All primary cardinality notation questions resolved with visual junction tables.'],
      misconceptions: ['None remaining in core learning objective'],
      improvements: ['All recommended scaffolding and physical analogies injected successfully!'],
    })
    setStudents((prev) =>
      prev.map((s) => ({
        ...s,
        understanding: Math.min(100, s.understanding + 22),
        response:
          s.profile === 'Struggling Student'
            ? '"The visual on junction tables and school enrollment made it completely click! I know why M:N needs a third table now."'
            : s.profile === 'Average Student'
              ? '"The step-by-step Crow’s Foot diagram walkthrough made the schema mapping 10x clearer. Scored 10/10 on the check."'
              : s.profile === 'Advanced Student'
                ? '"Loved the challenge on Enhanced ER ternary decomposition!"'
                : s.response,
        confusionPoints: s.profile === 'Struggling Student' ? ['Minor syntax on composite attributes'] : [],
        misconceptions: [],
      })),
    )
    toast({
      title: 'Lesson plan improved!',
      description: 'Scaffolding and visual proofs injected. Simulated understanding rose across all 3 student profiles.',
    })
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <PageHeader
        title="Student Simulation Sandbox"
        description="Stress-test your lesson against AI simulated student personas representing Struggling, Average, and Advanced learners before entering the physical classroom."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedTopic}
              onChange={(e) => setSelectedTopic(e.target.value)}
              className="h-9 rounded-lg border border-input bg-card px-3 text-sm font-semibold outline-none transition-colors focus-visible:border-ring focus-visible:ring-2"
            >
              <option value="ER Model">ER Model — Entity, Attribute, Cardinality</option>
              <option value="Trigonometric Identities">Trigonometric Identities</option>
              <option value="Introduction to Calculus">Introduction to Calculus</option>
              <option value="Quadratic Functions">Quadratic Functions</option>
            </select>
            <Button
              onClick={handleRunSimulation}
              disabled={isLoading}
              className="gap-2 shadow-sm"
            >
              <Sparkles className={`size-4 ${isLoading ? 'animate-pulse' : ''}`} />
              Run Simulation
            </Button>
          </div>
        }
      />

      {/* Loading state or Simulation Results */}
      {isLoading ? (
        <AILoading
          label={`Simulating 30 student interactions for ${selectedTopic}…`}
          steps={[
            'Simulating cognitive load for struggling learner persona…',
            'Testing misconception triggers on mathematical/relational notation…',
            'Evaluating exit ticket comprehension and friction points…',
            'Generating lesson effectiveness diagnostic metrics…',
          ]}
        />
      ) : (
        <>
          {/* Top Banner Alert for Improvement State */}
          {isImproved && (
            <Card className="border-success/30 bg-success/[0.05] p-4 text-success">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="size-5 text-success shrink-0" />
                <div className="text-sm font-medium">
                  Optimized Lesson Active: Effectiveness increased to 96%. Remedial scaffolding and visual analogies successfully resolved student misconceptions.
                </div>
              </div>
            </Card>
          )}

          {/* 3 Simulated Student Cards Grid */}
          <div className="grid gap-6 lg:grid-cols-3">
            {students.map((student) => {
              const profileConfig = {
                'Struggling Student': {
                  icon: AlertTriangle,
                  tone: 'border-destructive/30 bg-destructive/[0.02]',
                  tagVariant: 'destructive' as const,
                  gaugeTone: 'var(--color-destructive)',
                  description: 'Needs foundational visual scaffolding & prerequisite recall.',
                },
                'Average Student': {
                  icon: Users,
                  tone: 'border-primary/30 bg-primary/[0.02]',
                  tagVariant: 'default' as const,
                  gaugeTone: 'var(--color-primary)',
                  description: 'Understands basic concepts; struggles with multi-step transfer.',
                },
                'Advanced Student': {
                  icon: Rocket,
                  tone: 'border-success/30 bg-success/[0.02]',
                  tagVariant: 'success' as const,
                  gaugeTone: 'var(--color-success)',
                  description: 'Masters core lesson quickly; craves extension challenges.',
                },
              }
              const cfg = profileConfig[student.profile]
              const Icon = cfg.icon

              return (
                <Card
                  key={student.profile}
                  className={`flex flex-col justify-between border-2 transition-all hover:shadow-md ${cfg.tone}`}
                >
                  <div>
                    <CardHeader className="border-b border-border/60 pb-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="flex size-9 items-center justify-center rounded-lg bg-card text-foreground shadow-sm">
                            <Icon className="size-5 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-base font-bold">
                              {student.profile}
                            </CardTitle>
                            <p className="text-[11px] text-muted-foreground">{cfg.description}</p>
                          </div>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4 pt-4 text-sm">
                      {/* Understanding Gauge */}
                      <div className="flex items-center justify-between rounded-xl bg-card p-3 border border-border">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Understanding Level
                          </p>
                          <p className="font-display text-2xl font-bold text-foreground">
                            {student.understanding}%
                          </p>
                        </div>
                        <DonutChart
                          value={student.understanding}
                          size={64}
                          stroke={7}
                          tone={cfg.gaugeTone}
                          label={<span className="text-xs font-bold">{student.understanding}%</span>}
                        />
                      </div>

                      {/* Simulated Student Voice / Response */}
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          <MessageSquare className="size-3.5" />
                          Simulated Candid Feedback
                        </div>
                        <blockquote className="rounded-lg border-l-2 border-primary bg-muted/40 p-3 text-xs italic text-foreground leading-relaxed">
                          {student.response}
                        </blockquote>
                      </div>

                      {/* Confusion Points */}
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          <HelpCircle className="size-3.5 text-warning-foreground" />
                          Points of Confusion
                        </div>
                        {student.confusionPoints.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {student.confusionPoints.map((cp, idx) => (
                              <Badge key={idx} variant="warning" className="text-[11px] font-normal">
                                {cp}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-success flex items-center gap-1 font-medium">
                            <CheckCircle2 className="size-3" /> No friction points identified
                          </p>
                        )}
                      </div>

                      {/* Misconceptions */}
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          <AlertCircle className="size-3.5 text-destructive" />
                          Detected Misconceptions
                        </div>
                        {student.misconceptions.length > 0 ? (
                          <div className="space-y-1">
                            {student.misconceptions.map((mis, idx) => (
                              <div
                                key={idx}
                                className="rounded-md bg-destructive/10 px-2.5 py-1.5 text-[11px] font-medium text-destructive"
                              >
                                {mis}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-success flex items-center gap-1 font-medium">
                            <CheckCircle2 className="size-3" /> No misconceptions detected
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </div>
                </Card>
              )
            })}
          </div>

          {/* AI Lesson Effectiveness & Improvement Panel */}
          {analysis && (
            <Card className="border-primary/40 bg-card shadow-sm">
              <CardHeader className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Sparkles className="size-6" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-bold">
                      AI Lesson Diagnostic & Effectiveness Report ({selectedTopic})
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      Synthesized analysis across all 3 student personas with automated remediation.
                    </p>
                  </div>
                </div>

                <Button
                  onClick={handleApplyImprovements}
                  disabled={isImproved}
                  className="gap-2 shadow-sm"
                >
                  <Wand2 className="size-4" />
                  {isImproved ? 'Lesson Improved' : 'Improve Lesson'}
                </Button>
              </CardHeader>

              <CardContent className="grid gap-6 pt-6 md:grid-cols-2 lg:grid-cols-4">
                {/* Metric 1: Effectiveness Score */}
                <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-4">
                  <DonutChart
                    value={analysis.effectiveness}
                    size={72}
                    stroke={8}
                    tone="var(--color-primary)"
                  />
                  <div>
                    <p className="text-xs text-muted-foreground">Effectiveness Score</p>
                    <p className="font-display text-2xl font-bold">{analysis.effectiveness}/100</p>
                    <p className="text-[11px] text-muted-foreground">Pedagogical clarity</p>
                  </div>
                </div>

                {/* Metric 2: Predicted Engagement */}
                <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-4">
                  <DonutChart
                    value={analysis.engagement}
                    size={72}
                    stroke={8}
                    tone="var(--color-chart-2)"
                  />
                  <div>
                    <p className="text-xs text-muted-foreground">Engagement Index</p>
                    <p className="font-display text-2xl font-bold">{analysis.engagement}%</p>
                    <p className="text-[11px] text-muted-foreground">Active participation</p>
                  </div>
                </div>

                {/* Metric 3: Confusing Sections */}
                <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-1.5">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Confusing Sections Identified
                  </h4>
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    {analysis.confusingSections.map((cs, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-destructive font-bold">•</span>
                        <span>{cs}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Metric 4: Suggested Improvements */}
                <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-1.5">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Recommended Enhancements
                  </h4>
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    {analysis.improvements.map((imp, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <CheckCircle2 className="size-3 text-success shrink-0 mt-0.5" />
                        <span>{imp}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
