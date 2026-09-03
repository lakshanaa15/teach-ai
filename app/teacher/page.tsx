'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Award,
  BookOpen,
  Boxes,
  Calendar,
  Check,
  CheckCircle2,
  ClipboardList,
  Clock,
  Copy,
  FileCheck2,
  FileText,
  GraduationCap,
  HelpCircle,
  Layers,
  Lightbulb,
  ListOrdered,
  Plus,
  Rocket,
  RotateCcw,
  RotateCw,
  School,
  Sparkles,
  Target,
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
import { classTrend, teacher } from '@/lib/mock-data'
import { useToast } from '@/components/shared/toast'
import type { ClassroomInsightsResult } from '@/lib/types'

interface TeacherClass {
  id: string
  name: string
  classCode: string
  subject?: string
  subjectCode?: string
  academicYear?: string
  department?: string
  section?: string
  studentCount: number
  topics?: Array<{ id?: string; title: string }>
}

interface SavedLessonPlanSummary {
  id: string
  title: string
  subject: string
  grade: string
  topic: string
  status: 'Draft' | 'Approved' | 'Pending_Review'
  createdAt: string
  class?: { id: string; name: string; classCode: string } | null
}

interface SavedQuizSummary {
  id: string
  title: string
  subject?: string | null
  topic: string
  status: 'Draft' | 'Approved' | 'Pending_Review'
  questionCount?: number
  questions?: any[]
  createdAt: string
  class?: { id: string; name: string } | null
}

export default function TeacherDashboard() {
  const { toast } = useToast()
  const {
    students,
    topicMastery,
    activityFeed,
    insightsList,
    selectedTopic,
    approvalStatuses,
    resetToDefaults,
    teacherUser,
  } = useAppSession()

  const [classes, setClasses] = React.useState<TeacherClass[]>([])
  const [activeClassId, setActiveClassId] = React.useState<string>('')
  const [lessonPlans, setLessonPlans] = React.useState<SavedLessonPlanSummary[]>([])
  const [quizzes, setQuizzes] = React.useState<SavedQuizSummary[]>([])
  const [showCreateModal, setShowCreateModal] = React.useState(false)
  const [newClassName, setNewClassName] = React.useState('')
  const [newClassSubject, setNewClassSubject] = React.useState('')
  const [isCreatingClass, setIsCreatingClass] = React.useState(false)
  const [copiedCode, setCopiedCode] = React.useState<string | null>(null)

  // AI Teacher Assistant & Classroom Insights state
  const [insightClassId, setInsightClassId] = React.useState<string>('')
  const [insightTopic, setInsightTopic] = React.useState<string>('')
  const [isGeneratingInsights, setIsGeneratingInsights] = React.useState(false)
  const [classroomInsights, setClassroomInsights] = React.useState<ClassroomInsightsResult | null>(null)
  const [insufficientInsightsMsg, setInsufficientInsightsMsg] = React.useState<string | null>(null)
  const [selectedStudentGroupTab, setSelectedStudentGroupTab] = React.useState<
    'remedial' | 'standard' | 'advanced' | 'intervention'
  >('remedial')

  const activeClass = classes.find((c) => c.id === activeClassId) || classes[0]

  React.useEffect(() => {
    if (activeClass && !insightTopic) {
      if (activeClass.topics && activeClass.topics.length > 0) {
        setInsightTopic(activeClass.topics[0].title)
      } else {
        setInsightTopic(activeClass.subject || 'General')
      }
    }
  }, [activeClass, insightTopic])

  const handleGenerateClassroomInsights = async (force = false) => {
    if (!activeClass) {
      toast({ title: 'No Class Selected', description: 'Please select a class first.' })
      return
    }
    setIsGeneratingInsights(true)
    setInsufficientInsightsMsg(null)

    try {
      const res = await fetch('/api/teacher/classroom-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId: activeClass.id,
          topic: insightTopic || activeClass.subject || 'General Topic',
          forceGenerate: force,
        }),
      })

      const data = await res.json()

      if (data.insufficientData) {
        setInsufficientInsightsMsg(data.message)
        return
      }

      if (!res.ok || !data.success) {
        toast({
          title: 'Insights Generation Failed',
          description: data.error || 'Could not generate classroom insights.',
        })
        return
      }

      setClassroomInsights(data.insights)
      toast({
        title: 'Classroom Insights Ready! 💡',
        description: `Synthesized insights and teaching interventions for ${data.insights.className}.`,
      })
    } catch (err) {
      toast({
        title: 'Network Error',
        description: err instanceof Error ? err.message : 'Could not reach insights service.',
      })
    } finally {
      setIsGeneratingInsights(false)
    }
  }

  // Fetch real data on mount
  React.useEffect(() => {
    // 1. Fetch Classes
    fetch('/api/classes')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.success && Array.isArray(data.classes)) {
          setClasses(data.classes)
        }
      })
      .catch(() => {})

    // 2. Fetch Lesson Plans
    fetch('/api/lesson-plans')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.success && Array.isArray(data.lessonPlans)) {
          setLessonPlans(data.lessonPlans)
        }
      })
      .catch(() => {})

    // 3. Fetch Quizzes
    fetch('/api/quizzes')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.success && Array.isArray(data.quizzes)) {
          setQuizzes(data.quizzes)
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
        toast({
          title: 'Class created successfully! 🎉',
          description: `Code ${data.class.classCode} is ready for student enrollment.`,
        })
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
    toast({
      title: 'Class Code Copied! 📋',
      description: `Class code "${code}" copied to clipboard.`,
    })
    setTimeout(() => setCopiedCode(null), 2500)
  }

  // Calculate live stats from real DB
  const totalClasses = classes.length
  const totalStudents = classes.reduce((acc, c) => acc + (c.studentCount || 0), 0)
  const lessonsCreated = lessonPlans.length
  const lessonsPublished = lessonPlans.filter((p) => p.status === 'Approved').length
  const quizzesCreated = quizzes.length
  const avgPerformance = students.length > 0
    ? Math.round(students.reduce((acc, s) => acc + (s.overallScore || 70), 0) / students.length)
    : 0
  const atRiskCount = students.filter(
    (s) => s.status === 'At Risk' || s.status === 'Needs Attention',
  ).length

  const pendingApprovalPlans = lessonPlans.filter((p) => p.status !== 'Approved')
  const publishedPlans = lessonPlans.filter((p) => p.status === 'Approved')

  return (
    <div className="space-y-8">
      {/* Header with Welcome and Active Class Switcher */}
      <PageHeader
        title={`Welcome back, ${teacherUser.name}`}
        description={
          activeClass
            ? `${activeClass.name} · ${activeClass.subject}${activeClass.academicYear ? ` (${activeClass.academicYear})` : ''} · ${teacherUser.institutionName || 'Teaching Faculty'}`
            : `Set up your teaching assignment to start creating lessons · ${teacherUser.institutionName || 'Teaching Faculty'}`
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {classes.length > 1 && (
              <div className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1 text-xs">
                <School className="size-3.5 text-primary" />
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Class:</span>
                <select
                  value={activeClass?.id || ''}
                  onChange={(e) => setActiveClassId(e.target.value)}
                  className="bg-transparent font-semibold text-foreground text-xs outline-none cursor-pointer"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} — {c.subject}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <Link href="/teacher/classes">
              <Button size="sm" variant="outline" className="gap-1.5 text-xs">
                <School className="size-4" />
                Manage Classes
              </Button>
            </Link>
            <Link href="/teacher/lesson-plans">
              <Button size="sm" className="gap-1.5 text-xs shadow-sm font-semibold">
                <Sparkles className="size-4" />
                Create Lesson Plan
              </Button>
            </Link>
          </div>
        }
      />

      {/* Setup Warning if 0 Classes */}
      {classes.length === 0 && (
        <Card className="border-2 border-dashed border-primary/40 bg-primary/[0.02] p-6 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary mb-3">
            <School className="size-6" />
          </div>
          <h3 className="font-bold text-base text-foreground">Set up your teaching assignment</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1 mb-4">
            Configure your academic year, department, section, and subject so TeachAI can scope your lessons, quizzes, syllabus topics, and real student enrollments.
          </p>
          <Link href="/teacher/classes">
            <Button size="sm" className="gap-1.5 font-semibold">
              <Plus className="size-4" />
              Configure Classes & Subjects
            </Button>
          </Link>
        </Card>
      )}

      {/* 5 Essential Teacher SaaS KPI Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          label="Total Classes"
          value={totalClasses}
          icon={School}
          trend={{ value: `${totalClasses} active sections`, up: true }}
          tone="primary"
        />
        <StatCard
          label="Total Students"
          value={totalStudents}
          icon={Users}
          trend={{ value: `${totalStudents} enrolled`, up: true }}
          tone="primary"
        />
        <StatCard
          label="Lessons Created"
          value={lessonsCreated}
          icon={FileCheck2}
          trend={{ value: `${pendingApprovalPlans.length} pending approval`, up: true }}
          tone="primary"
        />
        <StatCard
          label="Lessons Published"
          value={lessonsPublished}
          icon={CheckCircle2}
          trend={{ value: `${lessonsPublished} live in classes`, up: true }}
          tone="success"
        />
        <StatCard
          label="Quizzes Created"
          value={quizzesCreated}
          icon={ClipboardList}
          trend={{ value: `${quizzes.filter(q => q.status === 'Approved').length} published`, up: true }}
          tone="primary"
        />
      </div>

      {/* TEACHER CLASS MANAGEMENT OVERVIEW SECTION */}
      <Card className="border-border shadow-sm">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-border/70">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <School className="size-5 text-primary" />
              <CardTitle className="text-base font-bold">My Teaching Classes & Enrollment Codes</CardTitle>
            </div>
            <p className="text-xs text-muted-foreground">
              Share unique 8-character codes with students for instant class registration.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/teacher/classes">
              <Button variant="outline" size="sm" className="text-xs gap-1">
                View All Classes <ArrowRight className="size-3.5" />
              </Button>
            </Link>
            <Button
              size="sm"
              onClick={() => setShowCreateModal(!showCreateModal)}
              className="gap-1.5 shadow-sm text-xs font-semibold"
            >
              <Plus className="size-3.5" />
              Create Class
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 pt-4">
          {/* Create Class Inline Form */}
          {showCreateModal && (
            <form
              onSubmit={handleCreateClass}
              className="rounded-xl border border-primary/40 bg-primary/[0.03] p-4 space-y-3 animate-in fade-in"
            >
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-foreground">Create New Teaching Section</h4>
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
                    className="h-9 w-full rounded-lg border border-input bg-card px-3 text-xs outline-none focus-visible:border-ring"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Subject</label>
                  <input
                    type="text"
                    value={newClassSubject}
                    onChange={(e) => setNewClassSubject(e.target.value)}
                    placeholder="e.g. Computer Science"
                    className="h-9 w-full rounded-lg border border-input bg-card px-3 text-xs outline-none focus-visible:border-ring"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" size="xs" disabled={isCreatingClass}>
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
                className="flex flex-col justify-between rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/40 hover:shadow-sm group"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                      {cls.name}
                    </h4>
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      {cls.studentCount} Students
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{cls.subject || 'Computer Science'}</p>
                </div>

                <div className="mt-4 flex items-center justify-between rounded-lg border border-border/80 bg-muted/40 p-2.5">
                  <div className="space-y-0.5">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Class Code</p>
                    <p className="font-mono text-sm font-bold text-primary tracking-wider">{cls.classCode}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => copyToClipboard(cls.classCode)}
                    className="gap-1 text-xs bg-card"
                    title="Copy class code"
                  >
                    {copiedCode === cls.classCode ? (
                      <>
                        <Check className="size-3 text-success" />
                        <span className="text-success">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="size-3 text-muted-foreground" />
                        <span>Copy</span>
                      </>
                    )}
                  </Button>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-2 text-xs">
                  <Link href={`/teacher/lesson-plans?classId=${cls.id}`} className="text-primary hover:underline font-medium">
                    + New Lesson
                  </Link>
                  <Link href={`/teacher/classes`} className="text-muted-foreground hover:text-foreground">
                    Class details →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* REAL AI TEACHER ASSISTANT & CLASSROOM INSIGHTS PANEL */}
      <Card className="border-2 border-primary/30 bg-card p-6 shadow-sm space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Sparkles className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-base font-bold text-foreground">
                  AI Teacher Assistant & Classroom Insights
                </h3>
                <Badge variant="outline" className="text-[10px] font-mono">
                  Live Decision Support
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Synthesizes real student quiz submissions, mastery curves, and common misconceptions into actionable pedagogy recommendations.
              </p>
            </div>
          </div>

          {/* Class & Topic Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-muted-foreground uppercase text-[10px]">Class:</span>
              <select
                value={insightClassId}
                onChange={(e) => setInsightClassId(e.target.value)}
                className="h-8 rounded-lg border border-input bg-card px-2.5 text-xs font-semibold outline-none focus-visible:border-ring"
              >
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-muted-foreground uppercase text-[10px]">Topic:</span>
              {activeClass?.topics && activeClass.topics.length > 0 ? (
                <select
                  value={insightTopic}
                  onChange={(e) => setInsightTopic(e.target.value)}
                  className="h-8 rounded-lg border border-input bg-card px-2.5 text-xs font-semibold outline-none focus-visible:border-ring"
                >
                  {activeClass.topics.map((t: any) => (
                    <option key={t.id || t.title} value={t.title}>
                      {t.title}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  placeholder="Enter syllabus topic..."
                  value={insightTopic}
                  onChange={(e) => setInsightTopic(e.target.value)}
                  className="h-8 rounded-lg border border-input bg-card px-2.5 text-xs font-semibold outline-none focus-visible:border-ring"
                />
              )}
            </div>

            <Button
              onClick={() => handleGenerateClassroomInsights(false)}
              disabled={isGeneratingInsights}
              size="sm"
              className="gap-1.5 shadow-sm font-semibold text-xs"
            >
              <Sparkles className={`size-3.5 ${isGeneratingInsights ? 'animate-spin' : ''}`} />
              {isGeneratingInsights ? 'Analyzing Class...' : 'Generate Classroom Insights'}
            </Button>
          </div>
        </div>

        {/* State A: Insufficient Data Alert */}
        {insufficientInsightsMsg && (
          <div className="rounded-xl border border-warning/30 bg-warning/[0.04] p-4 space-y-3 text-xs">
            <div className="flex items-center gap-2 font-bold text-warning-foreground">
              <AlertCircle className="size-4" />
              <span>Insufficient Classroom Performance History</span>
            </div>
            <p className="text-muted-foreground">{insufficientInsightsMsg}</p>
            <div className="flex gap-2 pt-1">
              <Link href="/teacher/quizzes">
                <Button size="xs" className="gap-1">
                  Assign Formative Quiz
                  <ArrowRight className="size-3" />
                </Button>
              </Link>
              <Button
                size="xs"
                variant="outline"
                onClick={() => handleGenerateClassroomInsights(true)}
                className="text-xs"
              >
                Generate Insights Anyway
              </Button>
            </div>
          </div>
        )}

        {/* State B: Initial Overview Banner (When insights not yet generated) */}
        {!classroomInsights && !insufficientInsightsMsg && (
          <div className="rounded-xl bg-muted/20 border border-border p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="space-y-1">
                <h4 className="font-bold text-sm text-foreground">
                  Ready to Synthesize Insights for {classes.find((c) => c.id === insightClassId)?.name || 'Class'}?
                </h4>
                <p className="text-xs text-muted-foreground">
                  Gemini will analyze real student assessment results on <strong>{insightTopic}</strong>, categorize learners into evidence-based tiers, highlight recurring cognitive misconceptions, and recommend specific teaching interventions.
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 text-xs pt-1">
              <div className="rounded-lg border border-border bg-card p-3 space-y-1">
                <span className="font-bold text-foreground flex items-center gap-1.5">
                  <TrendingUp className="size-3.5 text-primary" /> Deterministic Analytics
                </span>
                <p className="text-muted-foreground text-[11px]">
                  Real averages and mastery calculations computed directly from PostgreSQL.
                </p>
              </div>

              <div className="rounded-lg border border-border bg-card p-3 space-y-1">
                <span className="font-bold text-foreground flex items-center gap-1.5">
                  <AlertTriangle className="size-3.5 text-warning-foreground" /> Misconception Radar
                </span>
                <p className="text-muted-foreground text-[11px]">
                  Distinguishes verified error evidence from AI pedagogical hypotheses.
                </p>
              </div>

              <div className="rounded-lg border border-border bg-card p-3 space-y-1">
                <span className="font-bold text-foreground flex items-center gap-1.5">
                  <Users className="size-3.5 text-success" /> Evidence-Based Tiers
                </span>
                <p className="text-muted-foreground text-[11px]">
                  Direct grouping into Remedial, Standard, Advanced, and Intervention cohorts.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* State C: Active Classroom Insights Results */}
        {classroomInsights && (
          <div className="space-y-6 animate-in fade-in">
            {/* Deterministic Class Aggregates Grid */}
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <div className="rounded-xl border border-border bg-card p-3 text-center space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Class Mastery</span>
                <p className="text-xl font-black text-primary font-mono">
                  {classroomInsights.classSummary.overallMastery}%
                </p>
                <span className="text-[10px] text-muted-foreground">Deterministic Avg</span>
              </div>

              <div className="rounded-xl border border-border bg-card p-3 text-center space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Quiz Avg</span>
                <p className="text-xl font-black text-foreground font-mono">
                  {classroomInsights.classSummary.averageAssessmentScore}%
                </p>
                <span className="text-[10px] text-muted-foreground">Recent submissions</span>
              </div>

              <div className="rounded-xl border border-border bg-card p-3 text-center space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Analyzed</span>
                <p className="text-xl font-black text-foreground font-mono">
                  {classroomInsights.classSummary.studentsAnalyzed}
                </p>
                <span className="text-[10px] text-muted-foreground">Enrolled students</span>
              </div>

              <div className="rounded-xl border border-destructive/30 bg-destructive/[0.02] p-3 text-center space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-destructive">Needs Support</span>
                <p className="text-xl font-black text-destructive font-mono">
                  {classroomInsights.classSummary.strugglingCount}
                </p>
                <span className="text-[10px] text-muted-foreground">&lt;60% mastery</span>
              </div>

              <div className="rounded-xl border border-primary/30 bg-primary/[0.02] p-3 text-center space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-primary">On Track</span>
                <p className="text-xl font-black text-primary font-mono">
                  {classroomInsights.classSummary.onTrackCount}
                </p>
                <span className="text-[10px] text-muted-foreground">60–79% mastery</span>
              </div>

              <div className="rounded-xl border border-success/30 bg-success/[0.02] p-3 text-center space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-success">Advanced</span>
                <p className="text-xl font-black text-success font-mono">
                  {classroomInsights.classSummary.advancedCount}
                </p>
                <span className="text-[10px] text-muted-foreground">≥80% mastery</span>
              </div>
            </div>

            {/* Key Findings & Bottlenecks */}
            {classroomInsights.keyFindings.length > 0 && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/[0.03] p-4 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-destructive flex items-center gap-1.5 uppercase text-[11px]">
                    <AlertTriangle className="size-4" /> Primary Class-Wide Bottleneck
                  </span>
                  <Badge variant="destructive" className="text-[10px]">
                    {classroomInsights.keyFindings[0].severity} Severity
                  </Badge>
                </div>
                <h4 className="font-bold text-sm text-foreground">
                  {classroomInsights.keyFindings[0].finding}
                </h4>
                <p className="text-muted-foreground leading-relaxed">
                  <strong>Evidence:</strong> {classroomInsights.keyFindings[0].evidence}
                </p>
              </div>
            )}

            {/* Common Misconceptions Breakdown */}
            {classroomInsights.commonMisconceptions.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-4 space-y-3 text-xs shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground flex items-center gap-1.5 uppercase text-[11px]">
                    <HelpCircle className="size-4 text-warning-foreground" /> Common Cognitive Misconceptions
                  </span>
                  <Badge variant="outline" className="text-[10px]">
                    Evidence vs AI Hypothesis
                  </Badge>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {classroomInsights.commonMisconceptions.map((cm, idx) => (
                    <div
                      key={idx}
                      className="rounded-lg border border-warning/30 bg-warning/[0.02] p-3.5 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-[10px] font-mono">
                          {cm.concept}
                        </Badge>
                        <Badge variant="warning" className="text-[9px]">
                          {cm.confidence} Confidence
                        </Badge>
                      </div>

                      <p className="font-semibold text-foreground">"{cm.misconception}"</p>

                      <p className="text-muted-foreground text-[11px]">
                        <strong>Observed Evidence:</strong> {cm.evidence}
                      </p>

                      <p className="text-muted-foreground text-[11px] pt-1 border-t border-border/60">
                        <strong>Suggested Correction:</strong> {cm.suggestedCorrection}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Interactive Student Grouping Tabs */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-4 text-xs shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-3 gap-2">
                <div>
                  <h4 className="font-bold text-sm text-foreground">
                    Evidence-Based Student Cohorts
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Classified based on actual topic mastery, quiz performance, and active learning gaps.
                  </p>
                </div>

                {/* Cohort Tabs */}
                <div className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/30 p-1 self-start sm:self-auto">
                  {(['remedial', 'standard', 'advanced', 'intervention'] as const).map((tab) => {
                    const count = classroomInsights.studentGroups[tab].length
                    const label =
                      tab === 'remedial'
                        ? 'Needs Support'
                        : tab === 'standard'
                          ? 'On Track'
                          : tab === 'advanced'
                            ? 'Advanced'
                            : 'Intervention'
                    return (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setSelectedStudentGroupTab(tab)}
                        className={`rounded px-2.5 py-1 text-xs font-semibold transition-all ${
                          selectedStudentGroupTab === tab
                            ? 'bg-card text-foreground shadow-xs font-bold'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {label} ({count})
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Cohort Student Cards */}
              <div className="grid gap-2.5 sm:grid-cols-2 md:grid-cols-3">
                {classroomInsights.studentGroups[selectedStudentGroupTab].length === 0 ? (
                  <p className="text-muted-foreground italic text-xs col-span-full py-4 text-center">
                    No students currently in this tier for {classroomInsights.topic}.
                  </p>
                ) : (
                  classroomInsights.studentGroups[selectedStudentGroupTab].map((st) => (
                    <div
                      key={st.id}
                      className="rounded-lg border border-border bg-background p-3 space-y-1.5 text-xs transition-all hover:border-primary/40"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-foreground">{st.name}</span>
                        <Badge
                          variant={
                            st.mastery < 60
                              ? 'destructive'
                              : st.mastery >= 80
                                ? 'success'
                                : 'default'
                          }
                          className="text-[10px] font-mono"
                        >
                          {st.mastery}%
                        </Badge>
                      </div>

                      <p className="text-muted-foreground text-[11px]">
                        Quiz Average: <strong>{st.quizAverage}%</strong> • Tier: {st.tier}
                      </p>

                      {st.weakConcepts.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {st.weakConcepts.map((wc, i) => (
                            <span
                              key={i}
                              className="rounded bg-destructive/10 px-1.5 py-0.5 text-[9px] text-destructive font-medium"
                            >
                              {wc}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* AI Teaching Recommendations & Action CTAs */}
            <div className="space-y-3">
              <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
                Actionable AI Teaching Recommendations
              </h4>

              <div className="grid gap-3 sm:grid-cols-2">
                {classroomInsights.teachingRecommendations.map((rec, rIdx) => (
                  <div
                    key={rIdx}
                    className="flex flex-col justify-between rounded-xl border border-border bg-card p-4 space-y-3 text-xs shadow-2xs transition-all hover:border-primary/40"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Badge
                          variant={
                            rec.priority === 'High'
                              ? 'destructive'
                              : rec.priority === 'Medium'
                                ? 'warning'
                                : 'default'
                          }
                          className="text-[10px]"
                        >
                          {rec.priority} Priority
                        </Badge>
                        <span className="text-muted-foreground text-[10px]">
                          Cohort: <strong>{rec.targetGroup}</strong>
                        </span>
                      </div>

                      <h5 className="font-bold text-foreground text-sm leading-snug">{rec.action}</h5>
                      <p className="text-muted-foreground text-[11px] leading-relaxed">{rec.reason}</p>
                    </div>

                    <div className="pt-2 border-t border-border/60 flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground">Actionable Step:</span>
                      <Link
                        href={
                          rec.suggestedFeatureLink?.includes('lesson-plans')
                            ? `/teacher/lesson-plans?topic=${encodeURIComponent(insightTopic)}`
                            : rec.suggestedFeatureLink?.includes('adaptive')
                              ? `/teacher/adaptive?topic=${encodeURIComponent(insightTopic)}`
                              : `/teacher/quizzes?topic=${encodeURIComponent(insightTopic)}`
                        }
                      >
                        <Button size="xs" variant="outline" className="gap-1 text-[11px] h-7">
                          Execute Action
                          <ArrowRight className="size-3" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Differentiated Lesson Plan Roadmap */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-3 text-xs shadow-2xs">
              <h4 className="font-bold text-sm text-foreground">
                Recommended Differentiated Classroom Strategy
              </h4>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-warning/30 bg-warning/[0.02] p-3.5 space-y-2">
                  <div className="flex items-center gap-1.5 font-bold text-warning-foreground">
                    <Layers className="size-3.5" /> Remedial Support Track
                  </div>
                  <ul className="space-y-1 text-muted-foreground text-[11px]">
                    {classroomInsights.differentiation.remedial.map((step, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-warning-foreground font-bold">•</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-lg border border-primary/30 bg-primary/[0.02] p-3.5 space-y-2">
                  <div className="flex items-center gap-1.5 font-bold text-primary">
                    <GraduationCap className="size-3.5" /> Standard Grade-Level Track
                  </div>
                  <ul className="space-y-1 text-muted-foreground text-[11px]">
                    {classroomInsights.differentiation.standard.map((step, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-primary font-bold">•</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-lg border border-success/30 bg-success/[0.02] p-3.5 space-y-2">
                  <div className="flex items-center gap-1.5 font-bold text-success">
                    <Rocket className="size-3.5" /> Advanced Extension Track
                  </div>
                  <ul className="space-y-1 text-muted-foreground text-[11px]">
                    {classroomInsights.differentiation.advanced.map((step, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-success font-bold">•</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Sequential Next Steps & Teacher Authority Notice */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between rounded-xl bg-muted/20 border border-border p-4 gap-3 text-xs">
              <div className="space-y-1">
                <span className="font-bold text-foreground uppercase text-[10px] tracking-wider">
                  Teacher Action Protocol (This Week)
                </span>
                <p className="text-muted-foreground">
                  {classroomInsights.nextSteps.join(' → ')}
                </p>
              </div>

              <div className="rounded-lg border border-border bg-card px-3 py-2 text-[10px] text-muted-foreground shrink-0 max-w-xs">
                <strong>Teacher Final Authority:</strong> AI-generated insights are recommendations based on available student performance data. Review before taking classroom action.
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* RECENT LESSON PLANS & QUIZZES ROW */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Lesson Plans */}
        <Card className="border-border shadow-sm flex flex-col justify-between">
          <div>
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border/60">
              <div className="flex items-center gap-2">
                <FileCheck2 className="size-4.5 text-primary" />
                <CardTitle className="text-sm font-bold">Recent Lesson Plans</CardTitle>
              </div>
              <Link href="/teacher/lesson-plans">
                <Button variant="ghost" size="xs" className="text-xs text-primary gap-1">
                  View all ({lessonPlans.length}) <ArrowRight className="size-3" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-3 pt-4">
              {lessonPlans.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  <p>No lesson plans created yet.</p>
                  <Link href="/teacher/lesson-plans" className="mt-2 inline-block">
                    <Button size="xs" variant="outline" className="gap-1 text-xs">
                      <Sparkles className="size-3" /> Create First Lesson Plan
                    </Button>
                  </Link>
                </div>
              ) : (
                lessonPlans.slice(0, 4).map((lp) => (
                  <div
                    key={lp.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border/80 bg-card p-3 transition-colors hover:border-primary/40 hover:bg-muted/20"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={lp.status === 'Approved' ? 'success' : 'warning'}
                          className="text-[9px] uppercase font-bold"
                        >
                          {lp.status === 'Approved' ? 'Published' : 'Draft'}
                        </Badge>
                        <span className="text-xs text-muted-foreground truncate">{lp.subject}</span>
                      </div>
                      <h4 className="text-xs font-semibold text-foreground truncate">{lp.title}</h4>
                    </div>
                    <Link href="/teacher/lesson-plans" className="shrink-0">
                      <Button variant="outline" size="xs" className="text-xs">
                        {lp.status === 'Approved' ? 'View' : 'Edit'}
                      </Button>
                    </Link>
                  </div>
                ))
              )}
            </CardContent>
          </div>
          <div className="border-t border-border/60 p-3 bg-muted/15 flex items-center justify-between text-xs text-muted-foreground">
            <span>{publishedPlans.length} published · {pendingApprovalPlans.length} drafts</span>
            <Link href="/teacher/lesson-plans" className="text-primary hover:underline font-semibold">
              Open Generator →
            </Link>
          </div>
        </Card>

        {/* Quizzes Overview */}
        <Card className="border-border shadow-sm flex flex-col justify-between">
          <div>
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border/60">
              <div className="flex items-center gap-2">
                <ClipboardList className="size-4.5 text-primary" />
                <CardTitle className="text-sm font-bold">Formative Quizzes Overview</CardTitle>
              </div>
              <Link href="/teacher/quizzes">
                <Button variant="ghost" size="xs" className="text-xs text-primary gap-1">
                  All quizzes ({quizzes.length}) <ArrowRight className="size-3" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-3 pt-4">
              {quizzes.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  <p>No quizzes created yet.</p>
                  <Link href="/teacher/quizzes" className="mt-2 inline-block">
                    <Button size="xs" variant="outline" className="gap-1 text-xs">
                      <Plus className="size-3" /> Generate Formative Quiz
                    </Button>
                  </Link>
                </div>
              ) : (
                quizzes.slice(0, 4).map((q) => (
                  <div
                    key={q.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border/80 bg-card p-3 transition-colors hover:border-primary/40 hover:bg-muted/20"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={q.status === 'Approved' ? 'success' : 'warning'}
                          className="text-[9px] uppercase font-bold"
                        >
                          {q.status === 'Approved' ? 'Published' : 'Draft'}
                        </Badge>
                        <span className="text-xs text-muted-foreground truncate">{q.topic}</span>
                      </div>
                      <h4 className="text-xs font-semibold text-foreground truncate">{q.title}</h4>
                    </div>
                    <Link href="/teacher/quizzes" className="shrink-0">
                      <Button variant="outline" size="xs" className="text-xs">
                        Review
                      </Button>
                    </Link>
                  </div>
                ))
              )}
            </CardContent>
          </div>
          <div className="border-t border-border/60 p-3 bg-muted/15 flex items-center justify-between text-xs text-muted-foreground">
            <span>Aligned with Bloom’s taxonomy & curriculum standards</span>
            <Link href="/teacher/quizzes" className="text-primary hover:underline font-semibold">
              Quiz Studio →
            </Link>
          </div>
        </Card>
      </div>

      {/* Complete End-to-End Hackathon Workflow Banner */}
      <Card className="border-primary/30 bg-gradient-to-r from-primary/10 via-card to-chart-2/10 shadow-sm">
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="default" className="text-xs font-bold">
                Complete MVP Cycle
              </Badge>
              <h3 className="font-display text-sm font-bold text-foreground">
                Teach → Assess → Analyze → Adapt → Recommend Loop
              </h3>
            </div>
            <p className="text-xs text-muted-foreground text-pretty max-w-2xl">
              1. Create Lesson Plan & Quiz → 2. Teacher Verification & Inline Edits → 3. Publish to Class → 4. Students Take Quiz → 5. Live Diagnosed Learning Gaps & Recommendations.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Link href="/teacher/lesson-plans">
              <Button size="sm" className="gap-1.5 shadow-sm text-xs font-semibold">
                Start Lesson Generator
                <ArrowRight className="size-4" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Charts Row: Class Performance Trend & Topic Mastery Overview */}
      <div className="grid gap-6 lg:grid-cols-7">
        {/* Class Performance Line Chart */}
        <Card className="lg:col-span-4 border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-border/60">
            <div className="space-y-0.5">
              <CardTitle className="text-sm font-bold">
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
        <Card className="lg:col-span-3 border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-border/60">
            <div className="space-y-0.5">
              <CardTitle className="text-sm font-bold">Topic Mastery Breakdown</CardTitle>
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
        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-border/60">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              <CardTitle className="text-sm font-bold">
                AI Diagnostic Insights
              </CardTitle>
            </div>
            <Link href="/teacher/recommendations">
              <Button variant="ghost" size="xs" className="text-xs text-primary">
                All recommendations →
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-3 pt-3">
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
                      <Badge variant={badgeVariant[ins.severity]} className="text-[10px] uppercase font-bold">
                        {ins.severity}
                      </Badge>
                      <span className="text-[11px] text-muted-foreground">Automated alert</span>
                    </div>
                    <p className="text-xs font-semibold leading-snug">{ins.message}</p>
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
        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-border/60">
            <div className="flex items-center gap-2">
              <Clock className="size-4 text-primary" />
              <CardTitle className="text-sm font-bold">
                Live Pedagogical Stream
              </CardTitle>
            </div>
            <Badge variant="outline" className="text-[10px]">
              Live updates
            </Badge>
          </CardHeader>
          <CardContent className="space-y-3 pt-3">
            {activityFeed.slice(0, 5).map((act) => (
              <div
                key={act.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-border/70 bg-card p-3 transition-colors hover:bg-muted/40"
              >
                <div className="space-y-0.5 min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">{act.title}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{act.detail}</p>
                </div>
                <span className="shrink-0 text-[10px] font-mono text-muted-foreground">
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
