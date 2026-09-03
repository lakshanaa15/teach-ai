'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  AlertCircle,
  ArrowRight,
  Brain,
  CheckCircle2,
  Clock,
  Filter,
  Layers,
  Lightbulb,
  Play,
  RefreshCw,
  Rocket,
  Search,
  Send,
  Sparkles,
  Target,
  UserCheck,
  UserPlus,
  Users,
  Zap,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { RecommendationCard } from '@/components/shared/recommendation-card'
import { useAppSession } from '@/lib/session-context'
import type { Priority, Recommendation, DiagnosticReport } from '@/lib/types'
import { useToast } from '@/components/shared/toast'

export default function RecommendationsPage() {
  const { toast } = useToast()
  const { teacherRecommendations, students } = useAppSession()

  // Controls for running diagnostic recommendations
  const [selectedStudentId, setSelectedStudentId] = React.useState<string>('')
  const [targetTopic, setTargetTopic] = React.useState('ER Model — Entity, Attribute, Cardinality')
  const [isGenerating, setIsGenerating] = React.useState(false)
  const [diagnosticReport, setDiagnosticReport] = React.useState<DiagnosticReport | null>(null)
  const [liveRecs, setLiveRecs] = React.useState<Recommendation[]>(teacherRecommendations)
  const [realStudents, setRealStudents] = React.useState<any[]>([])
  const [syllabusTopics, setSyllabusTopics] = React.useState<string[]>([])

  // Load real enrolled students and syllabus topics
  React.useEffect(() => {
    fetch('/api/students')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.students && d.students.length > 0) {
          setRealStudents(d.students)
          setSelectedStudentId(d.students[0].id)
        }
      })
      .catch(() => {})

    fetch('/api/classes')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.classes && d.classes.length > 0) {
          const tops: string[] = []
          d.classes.forEach((c: any) => {
            if (Array.isArray(c.topics)) {
              c.topics.forEach((t: any) => {
                const title = typeof t === 'string' ? t : t.title
                if (title && !tops.includes(title)) tops.push(title)
              })
            }
          })
          if (tops.length > 0) {
            setSyllabusTopics(tops)
            setTargetTopic(tops[0])
          }
        }
      })
      .catch(() => {})
  }, [])

  // Filters
  const [selectedPriority, setSelectedPriority] = React.useState<string>('All')
  const [selectedTopic, setSelectedTopic] = React.useState<string>('All')
  const [search, setSearch] = React.useState('')

  // Sync session recommendations if no live generation yet
  React.useEffect(() => {
    if (!diagnosticReport && teacherRecommendations.length > 0) {
      setLiveRecs(teacherRecommendations)
    }
  }, [teacherRecommendations, diagnosticReport])

  const handleRunDiagnostic = async () => {
    if (!targetTopic.trim()) {
      toast({
        title: 'Missing Topic',
        description: 'Please enter a target academic topic to analyze.',
      })
      return
    }

    setIsGenerating(true)
    try {
      const res = await fetch('/api/recommendations/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: targetTopic.trim(),
          studentId: selectedStudentId,
        }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        toast({
          title: 'Diagnostic Failed',
          description: data.error || 'Could not generate AI diagnostic recommendations.',
        })
        return
      }

      if (data.diagnosticReport) {
        setDiagnosticReport(data.diagnosticReport)
      }

      if (data.recommendations && data.recommendations.length > 0) {
        setLiveRecs(data.recommendations)
      }

      toast({
        title: 'AI Diagnostic Generated ✨',
        description: `Identified ${data.diagnosticReport?.diagnosedGaps?.length || 0} gaps and ${data.recommendations?.length || 0} actionable interventions.`,
      })
    } catch (err) {
      toast({
        title: 'Connection Error',
        description: err instanceof Error ? err.message : 'Could not contact diagnostic service.',
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const filteredRecs = liveRecs.filter((rec) => {
    const matchesSearch =
      rec.title.toLowerCase().includes(search.toLowerCase()) ||
      rec.reason.toLowerCase().includes(search.toLowerCase()) ||
      (rec.studentName && rec.studentName.toLowerCase().includes(search.toLowerCase()))
    const matchesPriority = selectedPriority === 'All' || rec.priority === selectedPriority
    const matchesTopic = selectedTopic === 'All' || rec.topic === selectedTopic
    return matchesSearch && matchesPriority && matchesTopic
  })

  const handleAssignAllHighPriority = () => {
    const studentName = students.find((s) => s.id === selectedStudentId)?.name || 'Alex Rivera'
    toast({
      title: 'Batch interventions assigned',
      description: `Dispatched targeted interventions to ${studentName} and class cohort.`,
    })
  }

  const activeStudent = students.find((s) => s.id === selectedStudentId) || students[0]

  return (
    <div className="space-y-8">
      {/* Header */}
      <PageHeader
        title="AI Pedagogical Diagnostic & Recommendation Engine"
        description="Evidence-based learning gap interventions derived from real student quiz diagnostics, cognitive confusion indicators, and mastery retention data."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={handleAssignAllHighPriority}
              className="gap-2 shadow-sm"
            >
              <Send className="size-4" />
              Assign All High Priority
            </Button>
          </div>
        }
      />

      {/* Interactive Diagnostic Generator Toolbar */}
      <Card className="border-primary/30 bg-card shadow-sm">
        <CardHeader className="border-b border-border pb-3 bg-muted/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="size-4.5 text-primary" />
              <CardTitle className="text-sm font-bold">Generate Student Pedagogical Diagnostic</CardTitle>
            </div>
            <span className="text-xs text-muted-foreground">Powered by Google Gemini</span>
          </div>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-12 items-end">
            <div className="sm:col-span-4 space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Select Student</label>
              {realStudents.length > 0 ? (
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs shadow-xs focus-visible:border-ring"
                >
                  {realStudents.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.name} — {st.grade || 'Student'} ({st.overallScore || 0}% Mastery)
                    </option>
                  ))}
                </select>
              ) : (
                <div className="rounded border border-dashed border-border p-1.5 text-center text-xs text-muted-foreground">
                  No enrolled students yet
                </div>
              )}
            </div>

            <div className="sm:col-span-5 space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Target Topic (from Syllabus)</label>
              {syllabusTopics.length > 0 ? (
                <select
                  value={targetTopic}
                  onChange={(e) => setTargetTopic(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs shadow-xs focus-visible:border-ring"
                >
                  {syllabusTopics.map((top) => (
                    <option key={top} value={top}>
                      {top}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={targetTopic}
                  onChange={(e) => setTargetTopic(e.target.value)}
                  placeholder="e.g. ER Model — Entity, Attribute, Cardinality"
                  className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs shadow-xs focus-visible:border-ring"
                />
              )}
            </div>

            <div className="sm:col-span-3">
              <Button
                onClick={handleRunDiagnostic}
                disabled={isGenerating}
                className="w-full gap-1.5 text-xs font-semibold"
              >
                <Sparkles className={`size-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
                {isGenerating ? 'Diagnosing with Gemini...' : 'Run AI Diagnostic'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI DIAGNOSTIC REPORT PANEL */}
      {diagnosticReport && (
        <Card className="border-2 border-primary/30 bg-card shadow-md animate-in fade-in zoom-in-95">
          <CardHeader className="border-b border-border pb-4 bg-muted/20">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Sparkles className="size-4" />
                  </div>
                  <CardTitle className="text-base font-bold text-foreground">
                    Pedagogical Diagnostic Report: {targetTopic}
                  </CardTitle>
                  <Badge
                    variant={
                      diagnosticReport.status === 'Excelling'
                        ? 'success'
                        : diagnosticReport.status === 'On Track'
                          ? 'default'
                          : 'destructive'
                    }
                    className="text-xs"
                  >
                    {diagnosticReport.status || 'Diagnostic Complete'}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{diagnosticReport.studentSummary}</p>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-xs uppercase font-semibold text-muted-foreground">Topic Mastery</div>
                  <div className="text-2xl font-black text-primary font-mono tracking-tight">
                    {diagnosticReport.masteryScore}%
                  </div>
                </div>
                <Button
                  size="xs"
                  variant="outline"
                  onClick={handleRunDiagnostic}
                  disabled={isGenerating}
                  className="gap-1 text-xs text-primary"
                >
                  <RefreshCw className={`size-3 ${isGenerating ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-5 pt-4 text-xs">
            {/* Immediate Next Step Banner */}
            {diagnosticReport.nextStep && (
              <div className="flex items-center gap-2.5 rounded-lg bg-primary/10 border border-primary/20 p-3 text-primary font-medium">
                <Target className="size-4 shrink-0 animate-pulse" />
                <span>
                  <strong>RECOMMENDED TEACHER ACTION:</strong> {diagnosticReport.nextStep}
                </span>
              </div>
            )}

            {/* Diagnosed Gaps Grid */}
            {diagnosticReport.diagnosedGaps && diagnosticReport.diagnosedGaps.length > 0 && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2.5">
                  Diagnosed Knowledge Gaps & Root Causes
                </h4>
                <div className="grid gap-3 md:grid-cols-2">
                  {diagnosticReport.diagnosedGaps.map((gap, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-destructive/20 bg-destructive/[0.02] p-3.5 space-y-2 shadow-2xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-foreground">{gap.concept}</span>
                        <Badge
                          variant={gap.severity === 'High' ? 'destructive' : 'warning'}
                          className="text-[10px] py-0 px-1.5"
                        >
                          {gap.severity} Severity
                        </Badge>
                      </div>
                      <div className="space-y-1 text-muted-foreground">
                        <p>
                          <strong className="text-foreground">Performance Evidence:</strong> {gap.evidence}
                        </p>
                        <p>
                          <strong className="text-primary">Likely Pedagogical Cause:</strong> {gap.likelyCause}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Misconceptions Identified */}
            {diagnosticReport.misconceptions && diagnosticReport.misconceptions.length > 0 && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2.5">
                  Identified Misconceptions & Correction Strategies
                </h4>
                <div className="grid gap-3 md:grid-cols-2">
                  {diagnosticReport.misconceptions.map((misc, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-amber-500/30 bg-amber-500/[0.02] p-3.5 space-y-1.5 shadow-2xs"
                    >
                      <div className="flex items-center gap-1.5 font-semibold text-amber-600">
                        <AlertCircle className="size-3.5" />
                        <span>{misc.concept} Misconception</span>
                      </div>
                      <p className="text-muted-foreground">
                        <span className="font-medium text-foreground">&quot;{misc.misconception}&quot;</span>
                      </p>
                      <p className="text-muted-foreground">
                        <strong>Correction:</strong> {misc.correctionStrategy}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Demonstrated Strengths */}
            {diagnosticReport.strengths && diagnosticReport.strengths.length > 0 && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                  Demonstrated Strengths
                </h4>
                <div className="flex flex-wrap gap-2">
                  {diagnosticReport.strengths.map((str, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-1.5 rounded-lg border border-success/30 bg-success/5 px-2.5 py-1 text-success text-xs font-medium"
                    >
                      <CheckCircle2 className="size-3.5" />
                      <span>{str.concept}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search recommendations by student, topic, or reason…"
            className="h-9 w-full rounded-lg border border-input bg-card pl-9 pr-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Priority:</span>
          {['All', 'High', 'Medium', 'Low'].map((p) => (
            <Button
              key={p}
              variant={selectedPriority === p ? 'default' : 'outline'}
              size="xs"
              onClick={() => setSelectedPriority(p)}
              className="text-xs"
            >
              {p}
            </Button>
          ))}
        </div>
      </div>

      {/* Recommendation Cards Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-foreground">
            Targeted Intervention Pathways ({filteredRecs.length})
          </h3>
          <span className="text-xs text-muted-foreground">Generated dynamically by Google Gemini</span>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {filteredRecs.map((rec) => (
            <RecommendationCard key={rec.id} rec={rec} mode="teacher" />
          ))}
        </div>
      </div>
    </div>
  )
}
