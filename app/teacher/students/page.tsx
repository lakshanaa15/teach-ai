'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock,
  GraduationCap,
  Layers,
  Lightbulb,
  Mail,
  Plus,
  Rocket,
  School,
  Search,
  Sparkles,
  TrendingDown,
  TrendingUp,
  UserCheck,
  Users,
  Zap,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { LevelBadge, StatusBadge } from '@/components/shared/badges'
import { DonutChart, LineChart } from '@/components/shared/charts'
import { useAppSession } from '@/lib/session-context'
import type { Student } from '@/lib/types'
import { useToast } from '@/components/shared/toast'

export default function StudentsPage() {
  const { toast } = useToast()
  const { students } = useAppSession()

  const [search, setSearch] = React.useState('')
  const [selectedStatus, setSelectedStatus] = React.useState<string>('All')
  const [selectedLevel, setSelectedLevel] = React.useState<string>('All')
  const [selectedStudent, setSelectedStudent] = React.useState<Student | null>(null)

  // Real Database Class & Student Data
  const [classes, setClasses] = React.useState<any[]>([])
  const [selectedClassId, setSelectedClassId] = React.useState<string>('All')
  const [realStudents, setRealStudents] = React.useState<Student[]>([])
  const [isLoading, setIsLoading] = React.useState<boolean>(true)

  React.useEffect(() => {
    fetch('/api/classes')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.classes) setClasses(data.classes)
      })
      .catch(() => {})
  }, [])

  React.useEffect(() => {
    fetchStudents(selectedClassId)
  }, [selectedClassId])

  const fetchStudents = async (classId: string) => {
    setIsLoading(true)
    try {
      const url = classId === 'All' ? '/api/students' : `/api/students?classId=${classId}`
      const res = await fetch(url)
      const data = await res.json()
      if (res.ok && Array.isArray(data.students)) {
        setRealStudents(data.students)
      } else {
        setRealStudents([])
      }
    } catch {
      setRealStudents([])
    } finally {
      setIsLoading(false)
    }
  }

  const activeStudentList = realStudents

  const filteredStudents = activeStudentList.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase()) ||
      (s.weakTopics && s.weakTopics.some((t) => t.toLowerCase().includes(search.toLowerCase())))
    const matchesStatus = selectedStatus === 'All' || s.status === selectedStatus
    const matchesLevel = selectedLevel === 'All' || s.level === selectedLevel
    return matchesSearch && matchesStatus && matchesLevel
  })

  // Keep selected student synced with live state updates
  const activeStudent = selectedStudent
    ? activeStudentList.find((s) => s.id === selectedStudent.id) || selectedStudent
    : null

  return (
    <div className="space-y-8">
      {/* Header */}
      <PageHeader
        title="Student Roster & Real-time Diagnostics"
        description="Monitor individual mastery profiles, cognitive readiness tiers, identified learning gaps, and automated intervention histories."
        actions={
          <div className="flex items-center gap-2">
            <Link href="/teacher/recommendations">
              <Button size="sm" className="gap-1.5 shadow-sm">
                <Lightbulb className="size-4" />
                View Interventions
              </Button>
            </Link>
          </div>
        }
      />

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-3 max-w-xl">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search student by name, email, or weak topic…"
              className="h-9 w-full rounded-lg border border-input bg-card pl-9 pr-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25"
            />
          </div>

          {classes.length > 0 && (
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="h-9 rounded-lg border border-input bg-card px-2.5 text-xs font-semibold outline-none"
            >
              <option value="All">All Classes ({classes.length})</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.studentCount || 0} students)
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Status:</span>
          {['All', 'On Track', 'Needs Attention', 'At Risk'].map((status) => (
            <Button
              key={status}
              variant={selectedStatus === status ? 'default' : 'outline'}
              size="xs"
              onClick={() => setSelectedStatus(status)}
              className="text-xs"
            >
              {status}
            </Button>
          ))}
        </div>
      </div>

      {/* Student Cards Grid */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-44 rounded-xl border border-border bg-card p-5 animate-pulse" />
          ))}
        </div>
      ) : filteredStudents.length === 0 ? (
        <Card className="border-dashed border-2 border-border p-12 text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4">
            <Users className="size-7" />
          </div>
          <h3 className="font-display text-lg font-bold text-foreground">
            No students have joined this class yet
          </h3>
          <p className="mt-1 text-xs text-muted-foreground max-w-md mx-auto">
            Share your unique class code with students. Once students register and join, their diagnostics, cognitive tiers, and quiz performance will appear here automatically.
          </p>
          <Link href="/teacher/classes">
            <Button size="sm" className="mt-5 gap-1.5 font-semibold">
              <School className="size-4" />
              View Class Codes
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredStudents.map((student) => (
            <Card
              key={student.id}
              onClick={() => setSelectedStudent(student)}
              className="group cursor-pointer transition-all hover:border-primary/50 hover:shadow-md"
            >
            <CardContent className="space-y-4 p-5">
              {/* Top Row: Avatar & Status */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Avatar name={student.name} className="size-11 ring-2 ring-border" />
                  <div>
                    <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                      {student.name}
                    </h3>
                    <p className="text-xs text-muted-foreground">{student.grade} · {student.email}</p>
                  </div>
                </div>
                <StatusBadge status={student.status} />
              </div>

              {/* Badges & Scores */}
              <div className="flex items-center justify-between border-y border-border/60 py-3">
                <LevelBadge level={student.level} />
                <div className="flex items-center gap-4 text-xs">
                  <div>
                    <span className="text-muted-foreground">Score: </span>
                    <span className="font-bold text-foreground">{student.overallScore}%</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Progress: </span>
                    <span className="font-bold text-foreground">{student.progress}%</span>
                  </div>
                </div>
              </div>

              {/* Weak Topics */}
              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Identified Learning Gaps
                </p>
                {student.weakTopics.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {student.weakTopics.map((wt) => (
                      <Badge key={wt} variant="warning" className="text-[11px] font-normal">
                        {wt}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-success flex items-center gap-1 font-medium">
                    <CheckCircle2 className="size-3" /> No open gaps detected
                  </p>
                )}
              </div>

              {/* Bottom Action Footer */}
              <div className="flex items-center justify-between pt-1 text-xs text-primary font-medium">
                <span>View Full Diagnostic Profile</span>
                <ChevronRight className="size-4 transition-transform group-hover:translate-x-1" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      )}

      {/* Detailed Student Profile Drawer / Modal */}
      {activeStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95">
            <CardHeader className="flex flex-row items-start justify-between border-b border-border pb-4 bg-muted/20">
              <div className="flex items-center gap-4">
                <Avatar name={activeStudent.name} className="size-14 ring-2 ring-primary/20" />
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-xl font-bold">{activeStudent.name}</CardTitle>
                    <StatusBadge status={activeStudent.status} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {activeStudent.grade} · {activeStudent.email} · Learning Tier:{' '}
                    <strong className="text-foreground">{activeStudent.level}</strong>
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="icon-sm" onClick={() => setSelectedStudent(null)}>
                ✕
              </Button>
            </CardHeader>

            <CardContent className="space-y-6 pt-6 text-sm">
              {/* Top Stats Overview */}
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-border bg-card p-4 text-center">
                  <p className="text-xs text-muted-foreground">Overall Mastery Score</p>
                  <p className="font-display text-3xl font-bold text-foreground mt-1">
                    {activeStudent.overallScore}%
                  </p>
                  <LevelBadge level={activeStudent.level} />
                </div>

                <div className="rounded-xl border border-border bg-card p-4 text-center">
                  <p className="text-xs text-muted-foreground">Curriculum Progress</p>
                  <p className="font-display text-3xl font-bold text-primary mt-1">
                    {activeStudent.progress}%
                  </p>
                  <span className="text-[11px] text-muted-foreground">7 of 10 modules</span>
                </div>

                <div className="rounded-xl border border-border bg-card p-4 text-center">
                  <p className="text-xs text-muted-foreground">Open Learning Gaps</p>
                  <p className="font-display text-3xl font-bold text-warning-foreground mt-1">
                    {activeStudent.weakTopics.length}
                  </p>
                  <span className="text-[11px] text-muted-foreground">Needs remedial track</span>
                </div>
              </div>

              {/* Performance Trend Chart */}
              <div className="space-y-2 rounded-xl border border-border bg-card p-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-foreground text-xs uppercase tracking-wider text-muted-foreground">
                    7-Week Performance Progression
                  </h4>
                  <Badge variant="outline" className="text-xs font-mono">
                    Weekly Assessments
                  </Badge>
                </div>
                <LineChart
                  data={activeStudent.performanceTrend}
                  labels={['Wk 1', 'Wk 2', 'Wk 3', 'Wk 4', 'Wk 5', 'Wk 6', 'Wk 7']}
                  height={150}
                  tone="var(--color-primary)"
                />
              </div>

              {/* Topic Mastery Progress Bars */}
              <div className="space-y-3">
                <h4 className="font-semibold text-foreground text-xs uppercase tracking-wider text-muted-foreground">
                  Topic-by-Topic Cognitive Mastery (Live)
                </h4>
                <div className="grid gap-3 sm:grid-cols-2">
                  {activeStudent.topicMastery.map((tm) => {
                    const isWeak = tm.mastery < 60
                    return (
                      <div
                        key={tm.topic}
                        className={`rounded-lg border p-3 ${
                          isWeak ? 'border-destructive/30 bg-destructive/[0.03]' : 'border-border bg-card'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-foreground">{tm.topic}</span>
                          <span className={`font-bold ${isWeak ? 'text-destructive' : 'text-foreground'}`}>
                            {tm.mastery}%
                          </span>
                        </div>
                        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className={`h-full ${
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
                </div>
              </div>

              {/* Quiz History Table */}
              <div className="space-y-2">
                <h4 className="font-semibold text-foreground text-xs uppercase tracking-wider text-muted-foreground">
                  Recent Formative Quizzes (Live Submissions)
                </h4>
                <div className="divide-y divide-border rounded-lg border border-border bg-card">
                  {activeStudent.quizHistory.map((q) => (
                    <div key={q.id} className="flex items-center justify-between p-3 text-xs">
                      <div>
                        <p className="font-semibold text-foreground">{q.title}</p>
                        <p className="text-[11px] text-muted-foreground">Date: {q.date}</p>
                      </div>
                      <Badge
                        variant={q.score >= 75 ? 'success' : q.score >= 60 ? 'default' : 'destructive'}
                        className="font-mono text-xs"
                      >
                        {q.score}%
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommended Next Interventions */}
              <div className="space-y-2">
                <h4 className="font-semibold text-foreground text-xs uppercase tracking-wider text-muted-foreground">
                  AI Prescribed Next Actions
                </h4>
                <div className="space-y-2">
                  {activeStudent.nextActivities.map((act, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <Sparkles className="size-4 text-primary shrink-0" />
                        <span className="font-medium text-foreground">{act}</span>
                      </div>
                      <Button
                        size="xs"
                        onClick={() =>
                          toast({
                            title: 'Intervention assigned',
                            description: `Assigned "${act}" to ${activeStudent.name}.`,
                          })
                        }
                        className="shrink-0 text-xs"
                      >
                        Assign Action
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-border pt-4">
                <Button variant="outline" size="sm" onClick={() => setSelectedStudent(null)}>
                  Close
                </Button>
                <Link href={`/teacher/recommendations`}>
                  <Button size="sm" className="gap-1.5">
                    <Lightbulb className="size-4" />
                    Open in Recommendations
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
