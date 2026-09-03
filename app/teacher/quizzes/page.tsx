'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  Copy,
  Download,
  Edit3,
  FileCheck2,
  FileDown,
  Layers,
  ListPlus,
  Plus,
  Printer,
  RefreshCw,
  Save,
  Send,
  Sparkles,
  Trash2,
  XCircle,
  Zap,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LevelBadge } from '@/components/shared/badges'
import { AILoading } from '@/components/shared/states'
import { useToast } from '@/components/shared/toast'
import { exportQuizPDF } from '@/lib/export-pdf'
import { cn } from '@/lib/utils'

interface SavedQuestion {
  id: string
  type: 'MCQ' | 'True/False' | 'Short Answer'
  question: string
  options: string[]
  answer: string
  explanation: string
  concept?: string | null
  difficulty?: string | null
  marks?: number | null
}

interface SavedQuiz {
  id: string
  title: string
  subject?: string | null
  grade?: string | null
  topic: string
  learningObjective?: string | null
  duration?: string | null
  curriculum?: string | null
  source?: string | null
  difficulty: string
  status: 'Draft' | 'Approved' | 'Pending_Review'
  questions: SavedQuestion[]
  createdAt: string
  class?: { id: string; name: string; classCode: string } | null
}

interface TeacherClass {
  id: string
  name: string
  classCode: string
  subject?: string
  academicYear?: string
  topics?: Array<{ id: string; title: string }>
}

export default function QuizzesPage() {
  const { toast } = useToast()

  // 8 Required Teacher Inputs
  const [subject, setSubject] = React.useState('Database Management Systems')
  const [grade, setGrade] = React.useState('Grade 10')
  const [topic, setTopic] = React.useState('ER Model — Entity, Attribute, Cardinality')
  const [learningObjective, setLearningObjective] = React.useState(
    'Assess understanding of 1:1, 1:N, and M:N relationship cardinalities and junction table conversion.',
  )
  const [duration, setDuration] = React.useState('15 mins')
  const [noOfQuestions, setNoOfQuestions] = React.useState(4)
  const [curriculum, setCurriculum] = React.useState('CBSE / Computer Science')
  const [optionalSource, setOptionalSource] = React.useState('')
  const [selectedClassId, setSelectedClassId] = React.useState('')

  // State
  const [classes, setClasses] = React.useState<TeacherClass[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)
  const [activeQuiz, setActiveQuiz] = React.useState<SavedQuiz | null>(null)
  const [savedQuizzesList, setSavedQuizzesList] = React.useState<SavedQuiz[]>([])

  // Inline Question Editing
  const [editingQuestionId, setEditingQuestionId] = React.useState<string | null>(null)
  const [editFormData, setEditFormData] = React.useState<SavedQuestion | null>(null)
  const [quizTitle, setQuizTitle] = React.useState('')

  // Load teacher classes and existing quizzes
  React.useEffect(() => {
    fetchTeacherClasses()
    fetchSavedQuizzes()
  }, [])

  const handleSelectClass = (clsId: string) => {
    setSelectedClassId(clsId)
    const cls = classes.find((c) => c.id === clsId)
    if (cls) {
      if (cls.subject) setSubject(cls.subject)
      if (cls.academicYear) setGrade(cls.academicYear)
      if (cls.topics && cls.topics.length > 0) {
        setTopic(cls.topics[0].title)
      }
    }
  }

  const fetchTeacherClasses = async () => {
    try {
      const res = await fetch('/api/classes')
      const data = await res.json()
      if (res.ok && data.classes && data.classes.length > 0) {
        setClasses(data.classes)
        const first = data.classes[0]
        setSelectedClassId(first.id)
        if (first.subject) setSubject(first.subject)
        if (first.academicYear) setGrade(first.academicYear)
        if (first.topics && first.topics.length > 0) {
          setTopic(first.topics[0].title)
        }
      }
    } catch {
      // ignore
    }
  }

  const fetchSavedQuizzes = async () => {
    try {
      const res = await fetch('/api/quizzes')
      const data = await res.json()
      if (res.ok && data.quizzes && data.quizzes.length > 0) {
        setSavedQuizzesList(data.quizzes)
        if (!activeQuiz) {
          setActiveQuiz(data.quizzes[0])
          setQuizTitle(data.quizzes[0].title)
        }
      }
    } catch {
      // ignore
    }
  }

  const handleGenerate = async () => {
    const countNum = Number(noOfQuestions)
    if (!countNum || countNum < 1) {
      toast({ title: 'Validation Error', description: 'No. of Questions must be a positive integer.' })
      return
    }

    if (!subject.trim() || !grade.trim() || !topic.trim() || !learningObjective.trim() || !duration.trim() || !curriculum.trim()) {
      toast({
        title: 'Missing Required Fields',
        description: 'Please complete all required fields (Subject, Grade, Topic, Objective, Duration, Board).',
      })
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch('/api/quizzes/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: subject.trim(),
          grade: grade.trim(),
          topic: topic.trim(),
          learningObjective: learningObjective.trim(),
          duration: duration.trim(),
          curriculum: curriculum.trim(),
          count: countNum,
          optionalSource: optionalSource.trim() || undefined,
          classId: selectedClassId || undefined,
        }),
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        toast({
          title: 'Quiz Generation Failed',
          description: data.error || 'Gemini API failed to generate quiz.',
        })
        return
      }

      const quiz: SavedQuiz = data.quiz
      setActiveQuiz(quiz)
      setQuizTitle(quiz.title)
      setEditingQuestionId(null)
      setSavedQuizzesList((prev) => [quiz, ...prev.filter((q) => q.id !== quiz.id)])

      toast({
        title: `Generated ${quiz.questions.length} Questions with Gemini AI! 🎉`,
        description: `Quiz "${quiz.title}" saved as DRAFT in PostgreSQL.`,
      })
    } catch {
      toast({ title: 'Connection Error', description: 'Could not reach quiz generation service.' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleStartEditQuestion = (q: SavedQuestion) => {
    setEditingQuestionId(q.id)
    setEditFormData({ ...q })
  }

  const handleSaveInlineQuestionEdit = () => {
    if (!editFormData || !activeQuiz) return
    setActiveQuiz((prev) => {
      if (!prev) return null
      return {
        ...prev,
        questions: prev.questions.map((q) => (q.id === editFormData.id ? editFormData : q)),
      }
    })
    setEditingQuestionId(null)
    setEditFormData(null)
    toast({ title: 'Question updated in memory' })
  }

  const handleDeleteQuestion = (id: string) => {
    if (!activeQuiz) return
    setActiveQuiz((prev) => {
      if (!prev) return null
      return {
        ...prev,
        questions: prev.questions.filter((q) => q.id !== id),
      }
    })
    toast({ title: 'Question removed' })
  }

  const handleAddQuestion = () => {
    if (!activeQuiz) return
    const newQ: SavedQuestion = {
      id: `q-custom-${Date.now()}`,
      type: 'MCQ',
      question: 'New custom concept question…',
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      answer: 'Option A',
      explanation: 'Detailed pedagogical reason for this answer.',
      concept: activeQuiz.topic,
      difficulty: 'Standard',
      marks: 1,
    }
    setActiveQuiz((prev) => {
      if (!prev) return null
      return {
        ...prev,
        questions: [...prev.questions, newQ],
      }
    })
    handleStartEditQuestion(newQ)
  }

  const handleSaveChanges = async () => {
    if (!activeQuiz) return
    setIsSaving(true)

    try {
      const res = await fetch(`/api/quizzes/${activeQuiz.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: quizTitle.trim() || activeQuiz.title,
          questions: activeQuiz.questions,
          classId: selectedClassId || activeQuiz.class?.id || undefined,
        }),
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        toast({ title: 'Save Failed', description: data.error })
        return
      }

      setActiveQuiz(data.quiz)
      setSavedQuizzesList((prev) =>
        prev.map((q) => (q.id === data.quiz.id ? data.quiz : q)),
      )

      toast({
        title: 'Quiz Saved Successfully',
        description: 'All questions and edits persisted in PostgreSQL (Status: DRAFT).',
      })
    } catch {
      toast({ title: 'Error', description: 'Failed to save quiz changes.' })
    } finally {
      setIsSaving(false)
    }
  }

  const handlePublish = async () => {
    if (!activeQuiz) return
    setIsSaving(true)

    try {
      // First save latest questions and title
      await fetch(`/api/quizzes/${activeQuiz.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: quizTitle.trim() || activeQuiz.title,
          questions: activeQuiz.questions,
          classId: selectedClassId || activeQuiz.class?.id || undefined,
        }),
      })

      // Publish / Approve
      const res = await fetch(`/api/quizzes/${activeQuiz.id}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId: selectedClassId || activeQuiz.class?.id || undefined,
        }),
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        toast({ title: 'Publish Failed', description: data.error })
        return
      }

      setActiveQuiz(data.quiz)
      setSavedQuizzesList((prev) =>
        prev.map((q) => (q.id === data.quiz.id ? data.quiz : q)),
      )

      toast({
        title: 'Quiz Approved & Published! 🚀',
        description: `Quiz is now LIVE and visible to enrolled students.`,
      })
    } catch {
      toast({ title: 'Error', description: 'Failed to publish quiz.' })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteQuiz = async (id: string) => {
    try {
      const res = await fetch(`/api/quizzes/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setSavedQuizzesList((prev) => prev.filter((q) => q.id !== id))
        if (activeQuiz?.id === id) {
          const remaining = savedQuizzesList.filter((q) => q.id !== id)
          setActiveQuiz(remaining[0] || null)
          setQuizTitle(remaining[0]?.title || '')
        }
        toast({ title: 'Quiz deleted' })
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to delete quiz.' })
    }
  }

  const handleExportStudentPDF = () => {
    if (!activeQuiz) return
    exportQuizPDF(activeQuiz, 'student')
    toast({ title: 'Exporting Student Quiz PDF…', description: 'Printing student paper (answers hidden).' })
  }

  const handleExportAnswerKeyPDF = () => {
    if (!activeQuiz) return
    exportQuizPDF(activeQuiz, 'answer_key')
    toast({ title: 'Exporting Answer Key PDF…', description: 'Printing master copy with answers & explanations.' })
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <PageHeader
        title="Formative Quiz Generator & Assessment Rubrics"
        description="Generate curriculum-aligned formative quizzes with Google Gemini AI. Review, customize distractors, save drafts in PostgreSQL, export PDF exam papers, and publish directly to enrolled classes."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {activeQuiz && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportStudentPDF}
                  className="gap-1.5 text-xs shadow-sm"
                >
                  <FileDown className="size-4" />
                  Export Quiz PDF
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportAnswerKeyPDF}
                  className="gap-1.5 text-xs shadow-sm"
                >
                  <FileCheck2 className="size-4 text-primary" />
                  Export Answer Key PDF
                </Button>
                {activeQuiz.status !== 'Approved' ? (
                  <Button
                    size="sm"
                    onClick={handlePublish}
                    disabled={isSaving || isLoading}
                    className="gap-1.5 shadow-sm bg-success hover:bg-success/90"
                  >
                    <Send className="size-4" />
                    Approve & Publish
                  </Button>
                ) : (
                  <Badge variant="success" className="px-3 py-1 text-xs gap-1">
                    <Check className="size-3.5" /> Published
                  </Badge>
                )}
              </>
            )}
          </div>
        }
      />

      {/* Teacher Input Form Card (8 Inputs) */}
      <Card className="border-primary/30 bg-card shadow-sm">
        <CardHeader className="border-b border-border pb-3 bg-muted/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              <CardTitle className="text-sm font-bold">Assessment Generation Parameters</CardTitle>
            </div>
            <span className="text-xs text-muted-foreground">Powered by Google Gemini</span>
          </div>
        </CardHeader>

        <CardContent className="p-5 space-y-4">
          {/* Row 1: Class, Subject, Grade, Duration */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* 1. Select Class */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span>Select Class <span className="text-primary">*</span></span>
                <Link href="/teacher/classes" className="text-[10px] text-primary hover:underline">
                  Manage
                </Link>
              </label>
              <select
                value={selectedClassId}
                onChange={(e) => handleSelectClass(e.target.value)}
                className="h-9 w-full rounded-lg border border-input bg-background px-3 text-xs outline-none focus-visible:border-ring focus-visible:ring-2 font-medium"
              >
                {classes.length === 0 ? (
                  <option value="">No classes found (Create one first)</option>
                ) : (
                  classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.classCode})
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* 2. Subject (Auto-set from Class) */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span>Subject</span>
                <span className="text-[10px] text-muted-foreground font-normal">Auto-set</span>
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Database Management Systems"
                className="h-9 w-full rounded-lg border border-input bg-muted/40 px-3 text-xs outline-none focus-visible:border-ring focus-visible:ring-2 font-semibold"
              />
            </div>

            {/* 3. Grade */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Year / Grade <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                placeholder="e.g. III Year"
                className="h-9 w-full rounded-lg border border-input bg-background px-3 text-xs outline-none focus-visible:border-ring focus-visible:ring-2 font-medium"
              />
            </div>

            {/* 4. Duration */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Duration <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="e.g. 15 mins, 30 mins"
                className="h-9 w-full rounded-lg border border-input bg-background px-3 text-xs outline-none focus-visible:border-ring focus-visible:ring-2 font-medium"
              />
            </div>
          </div>

          {/* Row 2: Topic from Syllabus, No. of Questions, Curriculum */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* 5. Topic */}
            <div className="space-y-1.5 lg:col-span-2">
              <label className="text-xs font-semibold text-foreground">
                Select Topic (from Class Syllabus) <span className="text-destructive">*</span>
              </label>
              {(() => {
                const currClass = classes.find((c) => c.id === selectedClassId) || classes[0]
                const classTopics = currClass?.topics || []
                return classTopics.length > 0 ? (
                  <select
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="h-9 w-full rounded-lg border border-input bg-background px-3 text-xs outline-none focus-visible:border-ring focus-visible:ring-2 font-semibold"
                  >
                    {classTopics.map((t) => (
                      <option key={t.id || t.title} value={t.title}>
                        {t.title}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g. ER Model — Entity, Attribute, Cardinality"
                    className="h-9 w-full rounded-lg border border-input bg-background px-3 text-xs outline-none focus-visible:border-ring focus-visible:ring-2 font-medium"
                  />
                )
              })()}
            </div>

            {/* 6. No. of Questions */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                No. of Questions <span className="text-destructive">*</span>
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={noOfQuestions}
                onChange={(e) => setNoOfQuestions(Math.max(1, Number(e.target.value)))}
                className="h-9 w-full rounded-lg border border-input bg-background px-3 text-xs outline-none focus-visible:border-ring focus-visible:ring-2 font-medium"
              />
            </div>
          </div>

          {/* Row 3: Learning Objective */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Learning Objective <span className="text-destructive">*</span>
            </label>
            <textarea
              rows={2}
              value={learningObjective}
              onChange={(e) => setLearningObjective(e.target.value)}
              placeholder="e.g. Assess understanding of 1:1, 1:N, and M:N relationship cardinalities and junction table conversion..."
              className="w-full resize-none rounded-lg border border-input bg-background p-2.5 text-xs outline-none focus-visible:border-ring focus-visible:ring-2"
            />
          </div>

          {/* Row 4: Curriculum & Optional Source */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Curriculum / Board <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={curriculum}
                onChange={(e) => setCurriculum(e.target.value)}
                placeholder="e.g. Autonomous / Computer Science"
                className="h-9 w-full rounded-lg border border-input bg-background px-3 text-xs outline-none focus-visible:border-ring focus-visible:ring-2 font-medium"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">
                Optional Source / Context Notes
              </label>
              <input
                type="text"
                value={optionalSource}
                onChange={(e) => setOptionalSource(e.target.value)}
                placeholder="e.g. Lecture Notes Chapter 3, textbook excerpts..."
                className="h-9 w-full rounded-lg border border-input bg-background px-3 text-xs outline-none focus-visible:border-ring focus-visible:ring-2"
              />
            </div>
          </div>

          {/* Trigger Button */}
          <div className="flex justify-end pt-2 border-t border-border">
            <Button
              onClick={handleGenerate}
              disabled={isLoading || !subject.trim() || !topic.trim()}
              className="gap-2 shadow-sm"
            >
              <Sparkles className={`size-4 ${isLoading ? 'animate-spin' : ''}`} />
              {isLoading ? `Generating ${noOfQuestions} Questions with Gemini…` : 'Generate Quiz'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {isLoading && (
        <AILoading
          label={`Generating ${noOfQuestions} concept-mapped questions for ${topic} with Gemini AI…`}
          steps={[
            'Extracting core conceptual learning objectives…',
            'Constructing plausible distractor options mapped to common misconceptions…',
            'Drafting step-by-step explanatory feedback for student review…',
            'Saving draft assessment into PostgreSQL…',
          ]}
        />
      )}

      {/* Generated Quiz Result Display (SAME PAGE) */}
      {!isLoading && activeQuiz && (
        <div className="space-y-6 animate-in fade-in-50">
          {/* VISUAL WORKFLOW PIPELINE: DRAFT ➔ EDIT ➔ REVIEW ➔ APPROVED ➔ PUBLISHED */}
          <Card className="border-border bg-card p-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Quiz Publishing Lifecycle:
                </span>
                <Badge
                  variant={activeQuiz.status === 'Approved' ? 'success' : editingQuestionId ? 'default' : 'warning'}
                  className="text-[10px] uppercase font-bold"
                >
                  {activeQuiz.status === 'Approved' ? '✓ APPROVED & PUBLISHED' : editingQuestionId ? '✏️ IN EDIT' : '⚡ DRAFT REVIEW'}
                </Badge>
              </div>
              <p className="text-xs font-medium text-muted-foreground">
                {activeQuiz.status === 'Approved'
                  ? '✓ This formative quiz is live for assigned classes.'
                  : 'Review questions, options, and explanations before approving.'}
              </p>
            </div>

            {/* Stepper Steps */}
            <div className="grid grid-cols-5 gap-2 text-center text-xs font-semibold">
              {[
                { step: '1', label: 'DRAFT', done: true, desc: 'AI Generated' },
                { step: '2', label: 'EDIT', done: editingQuestionId !== null || activeQuiz.status === 'Approved', desc: 'Customized' },
                { step: '3', label: 'REVIEW', done: activeQuiz.status === 'Approved', desc: 'Pedagogical Check' },
                { step: '4', label: 'APPROVED', done: activeQuiz.status === 'Approved', desc: 'Sign-Off' },
                { step: '5', label: 'PUBLISHED', done: activeQuiz.status === 'Approved', desc: 'Live in Class' },
              ].map((s) => (
                <div key={s.label} className="flex flex-col items-center gap-1">
                  <div
                    className={cn(
                      'flex size-7 items-center justify-center rounded-full text-xs font-bold font-mono transition-all',
                      s.done
                        ? 'bg-primary text-primary-foreground shadow-xs'
                        : 'bg-muted text-muted-foreground',
                    )}
                  >
                    {s.done ? '✓' : s.step}
                  </div>
                  <span className={cn('text-[11px]', s.done ? 'text-foreground font-bold' : 'text-muted-foreground')}>
                    {s.label}
                  </span>
                  <span className="hidden md:inline text-[9px] text-muted-foreground font-normal">
                    {s.desc}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          {/* Action Bar */}
          <Card className="border-border bg-muted/20 p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Badge
                  variant={activeQuiz.status === 'Approved' ? 'success' : 'warning'}
                  className="px-2.5 py-0.5 font-bold uppercase text-[11px]"
                >
                  {activeQuiz.status === 'Approved' ? '✓ PUBLISHED' : '⚡ DRAFT'}
                </Badge>
                <div>
                  <h2 className="text-base font-bold text-foreground">
                    <input
                      type="text"
                      value={quizTitle}
                      onChange={(e) => setQuizTitle(e.target.value)}
                      className="h-8 rounded border border-input bg-card px-2 font-bold text-sm"
                    />
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {activeQuiz.subject} · {activeQuiz.grade} · {activeQuiz.questions.length} Questions · {activeQuiz.duration}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddQuestion}
                  className="gap-1.5 text-xs"
                >
                  <Plus className="size-3.5" />
                  Add Question
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSaveChanges}
                  disabled={isSaving}
                  className="gap-1.5 text-xs"
                >
                  <Save className="size-3.5" />
                  Save Draft
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportStudentPDF}
                  className="gap-1.5 text-xs"
                >
                  <FileDown className="size-3.5" />
                  Student PDF
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportAnswerKeyPDF}
                  className="gap-1.5 text-xs"
                >
                  <FileCheck2 className="size-3.5 text-primary" />
                  Answer Key PDF
                </Button>
                {activeQuiz.status !== 'Approved' && (
                  <Button
                    size="sm"
                    onClick={handlePublish}
                    disabled={isSaving}
                    className="gap-1.5 text-xs shadow-sm bg-success hover:bg-success/90"
                  >
                    <Send className="size-3.5" />
                    Approve & Publish
                  </Button>
                )}
              </div>
            </div>
          </Card>

          {/* Questions List */}
          <div className="space-y-4">
            {activeQuiz.questions.map((q, index) => {
              const isEditing = editingQuestionId === q.id

              return (
                <Card key={q.id} className="transition-all hover:border-primary/40">
                  <CardHeader className="flex flex-row items-start justify-between pb-3 border-b border-border/60">
                    <div className="flex items-center gap-2.5">
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                        Q{index + 1}
                      </span>
                      <Badge variant="outline" className="text-[11px] font-mono">
                        {q.type}
                      </Badge>
                      {q.concept && (
                        <Badge variant="secondary" className="text-[11px]">
                          {q.concept}
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-[10px]">
                        {q.marks || 1} mark{(q.marks || 1) > 1 ? 's' : ''}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() =>
                          isEditing ? handleSaveInlineQuestionEdit() : handleStartEditQuestion(q)
                        }
                        className="gap-1 text-xs text-muted-foreground hover:text-foreground"
                      >
                        <Edit3 className="size-3" />
                        {isEditing ? 'Done' : 'Edit'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => handleDeleteQuestion(q.id)}
                        className="text-xs text-destructive hover:text-destructive"
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4 pt-4 text-sm">
                    {isEditing && editFormData ? (
                      /* Inline Question Editor */
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs font-semibold uppercase text-muted-foreground">
                            Question Prompt
                          </label>
                          <textarea
                            value={editFormData.question}
                            onChange={(e) =>
                              setEditFormData({ ...editFormData, question: e.target.value })
                            }
                            rows={2}
                            className="mt-1 w-full rounded-lg border border-input bg-card p-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2"
                          />
                        </div>

                        {editFormData.options && editFormData.options.length > 0 && (
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold uppercase text-muted-foreground">
                              Options
                            </label>
                            {editFormData.options.map((opt, optIdx) => (
                              <input
                                key={optIdx}
                                type="text"
                                value={opt}
                                onChange={(e) => {
                                  const nextOpts = [...editFormData.options!]
                                  nextOpts[optIdx] = e.target.value
                                  setEditFormData({ ...editFormData, options: nextOpts })
                                }}
                                className="h-8 w-full rounded-lg border border-input bg-card px-2.5 text-xs outline-none focus-visible:border-ring focus-visible:ring-2"
                              />
                            ))}
                          </div>
                        )}

                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <label className="text-xs font-semibold uppercase text-muted-foreground">
                              Correct Answer
                            </label>
                            <input
                              type="text"
                              value={editFormData.answer}
                              onChange={(e) =>
                                setEditFormData({ ...editFormData, answer: e.target.value })
                              }
                              className="mt-1 h-8 w-full rounded-lg border border-input bg-card px-2.5 text-xs outline-none focus-visible:border-ring focus-visible:ring-2"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-semibold uppercase text-muted-foreground">
                              Explanation / Rationale
                            </label>
                            <input
                              type="text"
                              value={editFormData.explanation}
                              onChange={(e) =>
                                setEditFormData({
                                  ...editFormData,
                                  explanation: e.target.value,
                                })
                              }
                              className="mt-1 h-8 w-full rounded-lg border border-input bg-card px-2.5 text-xs outline-none focus-visible:border-ring focus-visible:ring-2"
                            />
                          </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                          <Button
                            variant="outline"
                            size="xs"
                            onClick={() => setEditingQuestionId(null)}
                          >
                            Cancel
                          </Button>
                          <Button size="xs" onClick={handleSaveInlineQuestionEdit}>
                            Save Question
                          </Button>
                        </div>
                      </div>
                    ) : (
                      /* Display Mode */
                      <>
                        <p className="font-medium text-foreground text-pretty">{q.question}</p>

                        {/* Options */}
                        {q.options && q.options.length > 0 && (
                          <div className="grid gap-2 sm:grid-cols-2">
                            {q.options.map((opt, i) => {
                              const isCorrect = opt === q.answer
                              return (
                                <div
                                  key={i}
                                  className={`flex items-center gap-2.5 rounded-lg border p-2.5 text-xs transition-colors ${
                                    isCorrect
                                      ? 'border-success/40 bg-success/10 font-semibold text-success'
                                      : 'border-border bg-muted/20 text-muted-foreground'
                                  }`}
                                >
                                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-card text-[11px] font-bold border border-border">
                                    {String.fromCharCode(65 + i)}
                                  </span>
                                  <span className="flex-1">{opt}</span>
                                  {isCorrect && <Check className="size-3.5 text-success shrink-0" />}
                                </div>
                              )
                            })}
                          </div>
                        )}

                        {/* Short Answer */}
                        {(!q.options || q.options.length === 0) && (
                          <div className="rounded-lg bg-muted/40 p-2.5 text-xs text-foreground">
                            <span className="font-semibold text-muted-foreground">Answer: </span>
                            <span className="font-mono font-bold text-success">{q.answer}</span>
                          </div>
                        )}

                        {/* Pedagogical Explanation */}
                        <div className="rounded-lg bg-primary/5 p-3 border border-primary/15 text-xs">
                          <span className="font-semibold text-primary">Pedagogical Explanation: </span>
                          <span className="text-muted-foreground">{q.explanation}</span>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Bottom Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <Link href={`/student/quizzes`}>
              <Button variant="outline" size="sm" className="gap-2 text-xs">
                View Student Assessment Portal
                <ArrowRight className="size-4" />
              </Button>
            </Link>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSaveChanges}
                disabled={isSaving}
                className="gap-1.5 text-xs"
              >
                <Save className="size-3.5" />
                Save Changes (Draft)
              </Button>
              {activeQuiz.status !== 'Approved' && (
                <Button
                  size="sm"
                  onClick={handlePublish}
                  disabled={isSaving}
                  className="gap-1.5 text-xs shadow-sm bg-success hover:bg-success/90"
                >
                  <Send className="size-3.5" />
                  Publish To Students
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
