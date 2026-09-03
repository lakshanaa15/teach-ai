'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  Clock,
  HelpCircle,
  Lock,
  Maximize2,
  MessageSquareText,
  Play,
  RotateCw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trophy,
  X,
  XCircle,
  Zap,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LevelBadge } from '@/components/shared/badges'
import { DonutChart } from '@/components/shared/charts'
import { useToast } from '@/components/shared/toast'
import { cn } from '@/lib/utils'
import type { QuizLearningAnalysis } from '@/lib/types'

interface EnrolledQuiz {
  id: string
  title: string
  subject: string
  grade: string
  topic: string
  duration: string
  difficulty: string
  questionCount: number
  teacherName: string
  className: string
  classCode: string
  isCompleted: boolean
  latestScore: number | null
  questions: Array<{
    id: string
    type: 'MCQ' | 'True/False' | 'Short Answer'
    question: string
    options?: string[]
    concept?: string
    difficulty?: string
    marks?: number
  }>
}

interface SubmissionEvaluation {
  id: string
  score: number
  total: number
  percentage: number
  identifiedGaps: string[]
  conceptResults: Array<{
    concept: string
    correct: boolean
    feedback: string
    userAnswer: string
    correctAnswer: string
    questionId: string
    questionText: string
    explanation: string
  }>
  learningAnalysis?: QuizLearningAnalysis
}

export default function StudentQuizzesPage() {
  const { toast } = useToast()

  const [quizzes, setQuizzes] = React.useState<EnrolledQuiz[]>([])
  const [isLoading, setIsLoading] = React.useState(true)

  // Exam Mode states
  const [confirmationQuiz, setConfirmationQuiz] = React.useState<EnrolledQuiz | null>(null)
  const [isInExamMode, setIsInExamMode] = React.useState(false)
  const [fullscreenExited, setFullscreenExited] = React.useState(false)
  const [exitCount, setExitCount] = React.useState(0)
  const [showSubmitConfirm, setShowSubmitConfirm] = React.useState(false)

  // Active quiz interaction states
  const [activeQuiz, setActiveQuiz] = React.useState<EnrolledQuiz | null>(null)
  const [currentQuestionIdx, setCurrentQuestionIdx] = React.useState(0)
  const [selectedAnswers, setSelectedAnswers] = React.useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [submissionResult, setSubmissionResult] = React.useState<SubmissionEvaluation | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = React.useState(0)

  // Timer effect for quiz
  React.useEffect(() => {
    if (!isInExamMode || submissionResult) {
      return
    }
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [isInExamMode, submissionResult])

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  // Fullscreen Helper Functions
  const requestFullscreenSafe = async () => {
    try {
      const elem = document.documentElement as any
      if (elem.requestFullscreen) {
        await elem.requestFullscreen()
      } else if (elem.webkitRequestFullscreen) {
        await elem.webkitRequestFullscreen()
      } else if (elem.msRequestFullscreen) {
        await elem.msRequestFullscreen()
      }
    } catch (err) {
      console.warn('Fullscreen request bypassed or denied:', err)
    }
  }

  const exitFullscreenSafe = async () => {
    try {
      const doc = document as any
      if (doc.fullscreenElement || doc.webkitFullscreenElement || doc.msFullscreenElement) {
        if (doc.exitFullscreen) {
          await doc.exitFullscreen()
        } else if (doc.webkitExitFullscreen) {
          await doc.webkitExitFullscreen()
        } else if (doc.msExitFullscreen) {
          await doc.msExitFullscreen()
        }
      }
    } catch (err) {
      console.warn('Exit fullscreen bypassed:', err)
    }
  }

  // Anti-cheating & Proctoring Event Handlers
  React.useEffect(() => {
    if (!isInExamMode || submissionResult) return

    const handleKeyDown = (e: KeyboardEvent) => {
      const isModifier = e.ctrlKey || e.metaKey
      const key = e.key.toLowerCase()

      // Block Copy, Cut, Paste, Select All, Print, Save, Source Inspection
      if (isModifier && ['c', 'v', 'x', 'a', 'p', 's', 'u'].includes(key)) {
        e.preventDefault()
        toast({
          title: 'Action Restricted 🔒',
          description: `Clipboard shortcuts (${isModifier ? 'Ctrl/Cmd+' : ''}${key.toUpperCase()}) are disabled in Exam Mode.`,
        })
        return
      }

      // Block Developer Tools / Inspect shortcuts
      if (e.key === 'F12' || (isModifier && e.shiftKey && ['i', 'j', 'c'].includes(key))) {
        e.preventDefault()
        toast({
          title: 'Proctoring Warning ⚠️',
          description: 'Developer inspect tools are disabled during examination.',
        })
        return
      }
    }

    // Fullscreen exit detection
    const handleFullscreenChange = () => {
      const isFull = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).msFullscreenElement
      )
      if (!isFull && isInExamMode && !submissionResult) {
        setFullscreenExited(true)
        setExitCount((prev) => prev + 1)
        toast({
          title: '⚠️ Exam Mode Interrupted',
          description: 'You exited fullscreen mode. Please return immediately.',
        })
      }
    }

    // Warn before accidental page reload / close
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }

    window.addEventListener('keydown', handleKeyDown)
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange)
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange)
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [isInExamMode, submissionResult, toast])

  React.useEffect(() => {
    fetchEnrolledQuizzes()
  }, [])

  const fetchEnrolledQuizzes = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/quizzes/enrolled')
      const data = await res.json()
      if (res.ok && data.quizzes) {
        setQuizzes(data.quizzes)
      }
    } catch {
      toast({ title: 'Notice', description: 'Could not load assigned quizzes.' })
    } finally {
      setIsLoading(false)
    }
  }

  // 1. Click "Start Quiz" ➔ Open Pre-Exam Confirmation Screen
  const handlePromptStartQuiz = (quiz: EnrolledQuiz) => {
    setConfirmationQuiz(quiz)
  }

  // 2. Click "Enter Exam Mode" in confirmation screen
  const handleEnterExamMode = async () => {
    if (!confirmationQuiz) return

    await requestFullscreenSafe()

    setActiveQuiz(confirmationQuiz)
    setConfirmationQuiz(null)
    setIsInExamMode(true)
    setFullscreenExited(false)
    setExitCount(0)
    setCurrentQuestionIdx(0)
    setSelectedAnswers({})
    setSubmissionResult(null)
    setElapsedSeconds(0)

    toast({
      title: 'Exam Mode Activated 🔒',
      description: 'Fullscreen engaged. Text copying and context menus are disabled.',
    })
  }

  // Resume Fullscreen after departure
  const handleResumeFullscreen = async () => {
    await requestFullscreenSafe()
    setFullscreenExited(false)
    toast({
      title: 'Resumed Exam Mode',
      description: 'Fullscreen restored. Continue your examination.',
    })
  }

  const handleSelectAnswer = (qId: string, ans: string) => {
    if (submissionResult) return
    setSelectedAnswers((prev) => ({ ...prev, [qId]: ans }))
  }

  const handlePromptSubmit = () => {
    setShowSubmitConfirm(true)
  }

  const handleSubmitQuiz = async () => {
    if (!activeQuiz) return
    setIsSubmitting(true)

    try {
      const res = await fetch(`/api/quizzes/${activeQuiz.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: selectedAnswers }),
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        toast({ title: 'Submission Failed', description: data.error })
        return
      }

      // Gracefully exit fullscreen
      await exitFullscreenSafe()
      setIsInExamMode(false)
      setFullscreenExited(false)
      setShowSubmitConfirm(false)
      setSubmissionResult(data.submission)
      fetchEnrolledQuizzes() // Refresh completed statuses

      toast({
        title: 'Exam Evaluated & Recorded! 🎉',
        description: `Score: ${data.submission.score}/${data.submission.total} (${data.submission.percentage}%). Concept mastery updated in PostgreSQL.`,
      })
    } catch {
      toast({ title: 'Error', description: 'Could not submit quiz for evaluation.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCloseResultsModal = () => {
    setActiveQuiz(null)
    setSubmissionResult(null)
    setIsInExamMode(false)
  }

  const pendingQuizzes = quizzes.filter((q) => !q.isCompleted)
  const completedQuizzes = quizzes.filter((q) => q.isCompleted)

  return (
    <div className="space-y-8">
      {/* Header */}
      <PageHeader
        title="Assigned Quizzes & Formative Assessments"
        description="Take concept-mapped quizzes published by your teachers in secure Exam Mode. Receive instant diagnostics, view explanations, and review misconceptions."
      />

      {/* Available Quizzes Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">Assigned Quizzes Ready to Take</h2>
          <span className="text-xs text-muted-foreground">{pendingQuizzes.length} available</span>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground border rounded-xl bg-card">
            Loading assigned quizzes from your enrolled courses…
          </div>
        ) : pendingQuizzes.length === 0 ? (
          <Card className="p-8 text-center bg-card border-dashed">
            <CheckCircle2 className="size-10 text-success mx-auto mb-2" />
            <h3 className="font-bold text-foreground">You are all caught up!</h3>
            <p className="text-xs text-muted-foreground mt-1">
              No pending quizzes for your enrolled courses right now. Newly published teacher quizzes will appear here automatically.
            </p>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {pendingQuizzes.map((quiz) => (
              <Card key={quiz.id} className="border-primary/40 bg-card p-5 transition-all hover:shadow-md">
                <div className="flex flex-col justify-between h-full space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <LevelBadge level={quiz.difficulty as any} />
                      <Badge variant="default" className="text-xs">
                        {quiz.className}
                      </Badge>
                    </div>
                    <h3 className="text-base font-bold text-foreground">{quiz.title}</h3>
                    <p className="text-xs text-muted-foreground">
                      Teacher: <strong className="text-foreground">{quiz.teacherName}</strong> · {quiz.subject} · {quiz.topic}
                    </p>
                  </div>

                  <div className="flex items-center justify-between border-t border-border pt-4 text-xs">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="size-3.5" /> {quiz.duration} · {quiz.questionCount} Questions
                    </span>
                    <Button onClick={() => handlePromptStartQuiz(quiz)} className="gap-1.5 shadow-sm text-xs font-semibold">
                      <Play className="size-3.5 fill-current" />
                      Start Quiz
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Completed Quizzes History */}
      {completedQuizzes.length > 0 && (
        <div className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold">Completed Assessment History</h2>
            <span className="text-xs text-muted-foreground">
              {completedQuizzes.length} assessments completed
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {completedQuizzes.map((q) => (
              <Card key={q.id} className="p-4 border-success/30 bg-success/[0.02]">
                <div className="flex items-center justify-between">
                  <div className="truncate pr-2">
                    <h4 className="font-semibold text-foreground text-sm truncate">{q.title}</h4>
                    <p className="text-xs text-muted-foreground">{q.topic}</p>
                  </div>
                  <Badge variant="success" className="font-mono text-sm shrink-0">
                    {q.latestScore !== null ? `${q.latestScore}%` : 'Done'}
                  </Badge>
                </div>
                <div className="mt-3 flex justify-end">
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => handlePromptStartQuiz(q)}
                    className="text-xs gap-1"
                  >
                    <RotateCw className="size-3" /> Retake
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* 1. PRE-EXAM CONFIRMATION MODAL */}
      {confirmationQuiz && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 p-4 backdrop-blur-sm animate-in fade-in">
          <Card className="w-full max-w-xl shadow-2xl border-primary/40 rounded-2xl overflow-hidden bg-card">
            <CardHeader className="border-b border-border/60 bg-gradient-to-r from-primary/10 via-card to-background p-6">
              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                  <ShieldCheck className="size-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg font-bold">Enter Exam Mode</CardTitle>
                    <Badge variant="default" className="text-[10px] uppercase font-bold tracking-wider">
                      Proctored Assessment
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{confirmationQuiz.className} · {confirmationQuiz.subject}</p>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6 space-y-5 text-xs">
              {/* Assessment Details Summary */}
              <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2">
                <h4 className="font-bold text-sm text-foreground">{confirmationQuiz.title}</h4>
                <p className="text-muted-foreground">{confirmationQuiz.topic}</p>
                <div className="flex flex-wrap items-center gap-3 pt-1 text-muted-foreground">
                  <span className="flex items-center gap-1 font-semibold text-foreground">
                    <BookOpen className="size-3.5 text-primary" /> {confirmationQuiz.questionCount} Questions
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Clock className="size-3.5" /> {confirmationQuiz.duration}
                  </span>
                  <span>•</span>
                  <LevelBadge level={confirmationQuiz.difficulty as any} />
                </div>
              </div>

              {/* Important Examination Rules */}
              <div className="space-y-2">
                <h5 className="font-bold uppercase tracking-wider text-muted-foreground text-[10px]">
                  Important Examination Instructions & Integrity Policy
                </h5>
                <div className="space-y-2 rounded-xl border border-border/70 bg-card p-3.5 text-muted-foreground">
                  <div className="flex items-start gap-2">
                    <Maximize2 className="size-4 shrink-0 text-primary mt-0.5" />
                    <span><strong>Fullscreen Environment:</strong> The assessment will run in full-screen mode to eliminate distractions.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Lock className="size-4 shrink-0 text-primary mt-0.5" />
                    <span><strong>Copy & Context Protection:</strong> Text selection, copying, pasting, and right-click menus are disabled.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <ShieldAlert className="size-4 shrink-0 text-warning-foreground mt-0.5" />
                    <span><strong>Exit Monitoring:</strong> Exiting fullscreen or switching windows will be logged as an integrity event.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="size-4 shrink-0 text-success mt-0.5" />
                    <span><strong>Auto-Saved Answers:</strong> All answers are preserved continuously in memory as you select them.</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border/60">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmationQuiz(null)}
                  className="text-xs"
                >
                  Cancel / Return
                </Button>
                <Button
                  size="sm"
                  onClick={handleEnterExamMode}
                  className="gap-2 text-xs font-semibold shadow-md bg-primary hover:bg-primary/90"
                >
                  <ShieldCheck className="size-4" />
                  Enter Exam Mode & Start
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 2. FULLSCREEN EXITED WARNING OVERLAY */}
      {fullscreenExited && isInExamMode && !submissionResult && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-foreground/80 p-4 backdrop-blur-md animate-in fade-in">
          <Card className="w-full max-w-md border-destructive/50 shadow-2xl p-6 text-center space-y-4 bg-card rounded-2xl">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
              <ShieldAlert className="size-8" />
            </div>

            <div className="space-y-1">
              <h3 className="font-display text-lg font-bold text-foreground">
                Exam Mode Interrupted
              </h3>
              <p className="text-xs text-muted-foreground">
                You exited fullscreen mode. Please return to fullscreen immediately to continue your assessment.
              </p>
            </div>

            <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive flex items-center justify-between">
              <span className="font-semibold">Integrity Events Logged:</span>
              <Badge variant="destructive" className="font-mono text-xs">
                {exitCount} warning{exitCount > 1 ? 's' : ''}
              </Badge>
            </div>

            <p className="text-[11px] text-muted-foreground">
              All of your selected answers have been preserved ({Object.keys(selectedAnswers).length} of {activeQuiz?.questions.length || 0} answered).
            </p>

            <Button
              onClick={handleResumeFullscreen}
              className="w-full gap-2 font-semibold text-xs shadow-md"
            >
              <Maximize2 className="size-4" />
              Return to Fullscreen Exam Mode
            </Button>
          </Card>
        </div>
      )}

      {/* 3. SUBMIT CONFIRMATION DIALOG */}
      {showSubmitConfirm && activeQuiz && (
        <div className="fixed inset-0 z-[105] flex items-center justify-center bg-foreground/60 p-4 backdrop-blur-sm animate-in fade-in">
          <Card className="w-full max-w-md border-border shadow-xl p-6 space-y-4 bg-card rounded-2xl">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <HelpCircle className="size-5" />
              </div>
              <div>
                <CardTitle className="text-base font-bold">Finalize Exam Submission?</CardTitle>
                <p className="text-xs text-muted-foreground">{activeQuiz.title}</p>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-muted/30 p-3 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Questions Answered:</span>
                <span className="font-bold text-foreground">
                  {Object.keys(selectedAnswers).length} / {activeQuiz.questions.length}
                </span>
              </div>
              {Object.keys(selectedAnswers).length < activeQuiz.questions.length && (
                <p className="text-warning-foreground text-[11px]">
                  ⚠️ You have {activeQuiz.questions.length - Object.keys(selectedAnswers).length} unanswered question(s). Unanswered questions will receive 0 marks.
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSubmitConfirm(false)}
                className="text-xs"
              >
                Review Questions
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setShowSubmitConfirm(false)
                  handleSubmitQuiz()
                }}
                disabled={isSubmitting}
                className="gap-1.5 text-xs font-semibold bg-success hover:bg-success/90 shadow-sm"
              >
                <CheckCircle2 className="size-4" />
                {isSubmitting ? 'Evaluating…' : 'Confirm & Submit Exam'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* 4. DEDICATED FULLSCREEN EXAM MODE CANVAS */}
      {isInExamMode && activeQuiz && !submissionResult && (
        <div
          onContextMenu={(e) => {
            e.preventDefault()
            toast({
              title: 'Right-Click Disabled 🔒',
              description: 'Context menu is disabled during Exam Mode.',
            })
          }}
          onCopy={(e) => {
            e.preventDefault()
            toast({
              title: 'Copy Disabled 🔒',
              description: 'Copying question content is prohibited in Exam Mode.',
            })
          }}
          onCut={(e) => {
            e.preventDefault()
            toast({
              title: 'Cut Disabled 🔒',
              description: 'Cutting content is prohibited in Exam Mode.',
            })
          }}
          onPaste={(e) => {
            e.preventDefault()
            toast({
              title: 'Paste Disabled 🔒',
              description: 'Pasting content is prohibited in Exam Mode.',
            })
          }}
          onDragStart={(e) => e.preventDefault()}
          className="fixed inset-0 z-[100] bg-background flex flex-col select-none overflow-hidden"
        >
          {/* Top Exam Mode Proctor Bar */}
          <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-card px-4 sm:px-8">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs">
                <ShieldCheck className="size-5" />
              </div>
              <div className="leading-tight">
                <div className="flex items-center gap-2">
                  <span className="font-display text-sm font-bold text-foreground">TeachAI Exam Mode</span>
                  <span className="flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-bold text-success">
                    <span className="size-1.5 rounded-full bg-success animate-pulse" />
                    PROCTORED
                  </span>
                </div>
                <p className="text-xs text-muted-foreground truncate max-w-[300px]">
                  {activeQuiz.title} · {activeQuiz.subject}
                </p>
              </div>
            </div>

            {/* Center: Live Timer & Progress */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-mono font-bold text-foreground shadow-2xs">
                <Clock className="size-3.5 text-primary animate-pulse" />
                <span>{formatTimer(elapsedSeconds)}</span>
              </div>

              {exitCount > 0 ? (
                <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-destructive/30 bg-destructive/10 px-3 py-1 text-xs text-destructive font-semibold">
                  <ShieldAlert className="size-3.5" />
                  <span>{exitCount} Warning{exitCount > 1 ? 's' : ''}</span>
                </div>
              ) : (
                <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-border bg-muted/20 px-3 py-1 text-xs text-muted-foreground">
                  <ShieldCheck className="size-3.5 text-success" />
                  <span>Integrity: Normal</span>
                </div>
              )}
            </div>

            {/* Right: Question Indicator & Finish button */}
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-semibold text-muted-foreground hidden md:inline">
                Question <strong>{currentQuestionIdx + 1}</strong> of {activeQuiz.questions.length}
              </span>
              <Button
                size="sm"
                onClick={handlePromptSubmit}
                className="text-xs font-semibold shadow-sm bg-success hover:bg-success/90"
              >
                <CheckCircle2 className="size-3.5" />
                Finish Exam
              </Button>
            </div>
          </header>

          {/* Linear Progress Bar */}
          <div className="h-1 w-full bg-muted/60">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{
                width: `${(Object.keys(selectedAnswers).length / activeQuiz.questions.length) * 100}%`,
              }}
            />
          </div>

          {/* Main Question Display Area */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-8 flex items-center justify-center">
            <div className="w-full max-w-3xl space-y-6">
              {activeQuiz.questions.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">No questions in this quiz.</div>
              ) : (
                (() => {
                  const q = activeQuiz.questions[currentQuestionIdx]
                  const isSelected = (opt: string) => selectedAnswers[q.id] === opt

                  return (
                    <div className="space-y-6 animate-in fade-in duration-200">
                      {/* Question Header Badges */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-sm font-bold text-primary">
                            Q{currentQuestionIdx + 1}
                          </span>
                          <Badge variant="outline" className="text-xs font-mono">
                            {q.type}
                          </Badge>
                          {q.concept && (
                            <Badge variant="secondary" className="text-xs">
                              {q.concept}
                            </Badge>
                          )}
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {q.marks || 1} Mark{(q.marks || 1) > 1 ? 's' : ''}
                        </Badge>
                      </div>

                      {/* Question Prompt */}
                      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                        <p className="text-base sm:text-lg font-medium text-foreground leading-relaxed">
                          {q.question}
                        </p>
                      </div>

                      {/* Answer Options */}
                      {q.options && q.options.length > 0 ? (
                        <div className="space-y-3">
                          {q.options.map((opt, i) => {
                            const active = isSelected(opt)
                            return (
                              <button
                                key={i}
                                type="button"
                                onClick={() => handleSelectAnswer(q.id, opt)}
                                className={cn(
                                  'group flex w-full items-center gap-3.5 rounded-2xl border p-4 text-left text-sm transition-all cursor-pointer',
                                  active
                                    ? 'border-primary bg-primary/10 font-semibold text-primary shadow-xs ring-2 ring-primary/30'
                                    : 'border-border bg-card text-foreground hover:border-primary/40 hover:bg-muted/30',
                                )}
                              >
                                <span
                                  className={cn(
                                    'flex size-7 shrink-0 items-center justify-center rounded-xl font-bold font-mono text-xs transition-colors',
                                    active
                                      ? 'bg-primary text-primary-foreground shadow-xs'
                                      : 'bg-muted text-muted-foreground group-hover:bg-muted/80 group-hover:text-foreground',
                                  )}
                                >
                                  {String.fromCharCode(65 + i)}
                                </span>
                                <span className="flex-1 leading-snug">{opt}</span>
                                {active && (
                                  <Check className="size-4 text-primary shrink-0 animate-in zoom-in-50" />
                                )}
                              </button>
                            )
                          })}
                        </div>
                      ) : (
                        /* Short Answer Text Input */
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-muted-foreground">
                            Type your answer in the box below:
                          </label>
                          <input
                            type="text"
                            value={selectedAnswers[q.id] || ''}
                            onChange={(e) => handleSelectAnswer(q.id, e.target.value)}
                            placeholder="Type your response here..."
                            className="h-11 w-full rounded-xl border border-input bg-card px-4 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 font-medium"
                          />
                        </div>
                      )}
                    </div>
                  )
                })()
              )}
            </div>
          </main>

          {/* Bottom Exam Navigation Toolbar */}
          <footer className="h-18 shrink-0 border-t border-border bg-card px-4 sm:px-8 flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentQuestionIdx((prev) => Math.max(0, prev - 1))}
              disabled={currentQuestionIdx === 0}
              className="text-xs"
            >
              Previous Question
            </Button>

            {/* Question Jump Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto max-w-md py-1 px-2">
              {activeQuiz.questions.map((q, idx) => {
                const isCurrent = currentQuestionIdx === idx
                const isAnswered = !!selectedAnswers[q.id]

                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => setCurrentQuestionIdx(idx)}
                    title={`Jump to Question ${idx + 1}`}
                    className={cn(
                      'size-7 rounded-xl text-xs font-bold font-mono transition-all flex items-center justify-center shrink-0 cursor-pointer',
                      isCurrent
                        ? 'bg-primary text-primary-foreground shadow-sm ring-2 ring-primary/40'
                        : isAnswered
                          ? 'bg-primary/15 text-primary border border-primary/30 font-semibold'
                          : 'bg-muted text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {idx + 1}
                  </button>
                )
              })}
            </div>

            {currentQuestionIdx < activeQuiz.questions.length - 1 ? (
              <Button
                size="sm"
                onClick={() =>
                  setCurrentQuestionIdx((prev) =>
                    Math.min(activeQuiz.questions.length - 1, prev + 1),
                  )
                }
                className="text-xs font-semibold shadow-xs"
              >
                Next Question
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handlePromptSubmit}
                className="gap-1.5 shadow-sm text-xs font-semibold bg-success hover:bg-success/90"
              >
                <CheckCircle2 className="size-4" />
                Submit Exam
              </Button>
            )}
          </footer>
        </div>
      )}

      {/* 5. POST-EXAM EVALUATION RESULTS MODAL */}
      {submissionResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 p-4 backdrop-blur-sm animate-in fade-in">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl rounded-2xl flex flex-col bg-card">
            {/* Modal Header */}
            <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-4 bg-muted/20">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-xl bg-success/15 text-success">
                  <Trophy className="size-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold">Assessment Results & Diagnostic Review</CardTitle>
                  <p className="text-xs text-muted-foreground">{activeQuiz?.title}</p>
                </div>
              </div>
              <Button variant="ghost" size="icon-sm" onClick={handleCloseResultsModal} title="Close Results">
                <X className="size-4" />
              </Button>
            </CardHeader>

            <CardContent className="space-y-6 p-6 text-sm">
              {/* Score Banner */}
              <div className="flex flex-col items-center justify-center gap-3 rounded-2xl bg-muted/40 p-6 text-center border border-border">
                <DonutChart
                  value={submissionResult.percentage}
                  size={110}
                  stroke={11}
                  tone={
                    submissionResult.percentage >= 75
                      ? 'var(--color-success)'
                      : submissionResult.percentage >= 50
                        ? 'var(--color-chart-1)'
                        : 'var(--color-destructive)'
                  }
                  label={
                    <div className="text-center">
                      <span className="font-display text-2xl font-bold">
                        {submissionResult.percentage}%
                      </span>
                    </div>
                  }
                />
                <div>
                  <h3 className="font-display text-lg font-bold">
                    {submissionResult.percentage >= 75
                      ? 'Assessment Completed! 🎉'
                      : 'Diagnostics Generated: Learning Gaps Identified 💡'}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 max-w-md">
                    You scored <strong>{submissionResult.score}</strong> of <strong>{submissionResult.total}</strong> marks ({submissionResult.percentage}%).
                    Your progress analytics have been recorded in PostgreSQL.
                  </p>
                </div>

                {submissionResult.identifiedGaps.length > 0 && (
                  <div className="mt-2 rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive text-left w-full">
                    <strong>Identified Learning Gaps: </strong>
                    {submissionResult.identifiedGaps.join(', ')}
                  </div>
                )}
              </div>

              {/* AI LEARNING-GAP ANALYSIS PANEL */}
              {submissionResult.learningAnalysis && (
                <div className="rounded-2xl border-2 border-primary/30 bg-card p-5 space-y-4 shadow-sm animate-in fade-in">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-3">
                    <div className="flex items-center gap-2">
                      <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Sparkles className="size-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-foreground">AI Learning Analysis & Concept Diagnostics</h4>
                        <p className="text-[11px] text-muted-foreground">{submissionResult.learningAnalysis.overallSummary}</p>
                      </div>
                    </div>
                    <Badge
                      variant={
                        submissionResult.learningAnalysis.recommendedTier === 'Advanced'
                          ? 'success'
                          : submissionResult.learningAnalysis.recommendedTier === 'Standard'
                            ? 'default'
                            : 'warning'
                      }
                      className="text-xs shrink-0 self-start sm:self-auto"
                    >
                      Track: {submissionResult.learningAnalysis.recommendedTier}
                    </Badge>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {/* Strengths / Strong Areas */}
                    {submissionResult.learningAnalysis.strengths?.length > 0 && (
                      <div className="rounded-xl border border-success/30 bg-success/[0.02] p-3.5 space-y-2">
                        <div className="flex items-center gap-1.5 font-bold text-xs text-success uppercase tracking-wider">
                          <CheckCircle2 className="size-3.5" />
                          <span>Strong Areas Mastered</span>
                        </div>
                        <ul className="space-y-1.5 text-xs text-muted-foreground">
                          {submissionResult.learningAnalysis.strengths.map((st, i) => (
                            <li key={i} className="flex items-start gap-1.5">
                              <span className="text-success font-bold">✓</span>
                              <span>
                                <strong className="text-foreground">{st.concept}:</strong> {st.evidence}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Needs Practice / Learning Gaps */}
                    {submissionResult.learningAnalysis.learningGaps?.length > 0 && (
                      <div className="rounded-xl border border-destructive/30 bg-destructive/[0.02] p-3.5 space-y-2">
                        <div className="flex items-center gap-1.5 font-bold text-xs text-destructive uppercase tracking-wider">
                          <AlertTriangle className="size-3.5" />
                          <span>Needs Practice (Gaps Identified)</span>
                        </div>
                        <ul className="space-y-1.5 text-xs text-muted-foreground">
                          {submissionResult.learningAnalysis.learningGaps.map((gap, i) => (
                            <li key={i} className="space-y-0.5">
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-foreground">⚠ {gap.concept}</span>
                                <Badge variant={gap.severity === 'High' ? 'destructive' : 'warning'} className="text-[9px] py-0 px-1">
                                  {gap.severity}
                                </Badge>
                              </div>
                              <p className="text-[11px]">{gap.likelyCause}</p>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Detected Misconceptions */}
                  {submissionResult.learningAnalysis.misconceptions?.length > 0 && (
                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/[0.02] p-3.5 space-y-2 text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-amber-600 uppercase tracking-wider">
                        <AlertCircle className="size-3.5" />
                        <span>Possible Conceptual Misconceptions</span>
                      </div>
                      <div className="space-y-2 text-muted-foreground">
                        {submissionResult.learningAnalysis.misconceptions.map((m, i) => (
                          <div key={i} className="space-y-1">
                            <p className="text-foreground font-medium">&quot;{m.misconception}&quot;</p>
                            <p className="text-[11px]">
                              <strong className="text-primary">How to correct:</strong> {m.correctionStrategy}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recommended Next Step CTA */}
                  {submissionResult.learningAnalysis.nextLearningActions?.length > 0 && (
                    <div className="rounded-xl bg-primary/10 border border-primary/20 p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 font-bold text-primary">
                          <Zap className="size-3.5" />
                          <span>Recommended Next Step</span>
                        </div>
                        <p className="text-muted-foreground">
                          {submissionResult.learningAnalysis.nextLearningActions[0].action} —{' '}
                          {submissionResult.learningAnalysis.nextLearningActions[0].suggestedActivity}
                        </p>
                      </div>
                      <Link href="/student/learning">
                        <Button size="xs" className="gap-1.5 shrink-0 font-semibold shadow-xs">
                          Launch {submissionResult.learningAnalysis.recommendedTier} Track
                          <ArrowRight className="size-3" />
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              )}

              {/* Question Explanations List */}
              <div className="space-y-4">
                <h4 className="font-semibold text-foreground text-xs uppercase tracking-wider text-muted-foreground">
                  Diagnostic Feedback & Step-by-Step Explanations
                </h4>

                {submissionResult.conceptResults.map((cr, idx) => (
                  <div
                    key={idx}
                    className={`rounded-xl border p-4 space-y-2 text-xs ${
                      cr.correct
                        ? 'border-success/30 bg-success/[0.02]'
                        : 'border-destructive/30 bg-destructive/[0.02]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground">Question {idx + 1}</span>
                        <Badge
                          variant={cr.correct ? 'success' : 'destructive'}
                          className="text-[10px]"
                        >
                          {cr.correct ? '✓ Correct' : '✗ Incorrect'}
                        </Badge>
                      </div>
                      <span className="text-muted-foreground">{cr.concept}</span>
                    </div>

                    <p className="font-medium text-foreground">{cr.questionText}</p>

                    <div className="grid gap-1.5 sm:grid-cols-2 pt-1">
                      <div className="rounded-lg bg-background p-2 border border-border">
                        <span className="text-muted-foreground block text-[10px]">Your Answer:</span>
                        <span className={cr.correct ? 'text-success font-semibold' : 'text-destructive font-semibold'}>
                          {cr.userAnswer || 'No answer submitted'}
                        </span>
                      </div>
                      <div className="rounded-lg bg-background p-2 border border-border">
                        <span className="text-muted-foreground block text-[10px]">Correct Answer:</span>
                        <span className="text-success font-semibold">{cr.correctAnswer}</span>
                      </div>
                    </div>

                    <p className="text-muted-foreground pt-1 leading-relaxed">
                      <strong>Explanation: </strong>
                      {cr.explanation || cr.feedback}
                    </p>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 border-t border-border pt-4">
                <Button size="sm" onClick={handleCloseResultsModal} className="text-xs font-semibold">
                  Return to Quizzes
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
