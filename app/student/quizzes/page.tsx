'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  Clock,
  HelpCircle,
  MessageSquareText,
  Play,
  RotateCw,
  Sparkles,
  Trophy,
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
}

export default function StudentQuizzesPage() {
  const { toast } = useToast()

  const [quizzes, setQuizzes] = React.useState<EnrolledQuiz[]>([])
  const [isLoading, setIsLoading] = React.useState(true)

  // Active quiz state
  const [activeQuiz, setActiveQuiz] = React.useState<EnrolledQuiz | null>(null)
  const [currentQuestionIdx, setCurrentQuestionIdx] = React.useState(0)
  const [selectedAnswers, setSelectedAnswers] = React.useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [submissionResult, setSubmissionResult] = React.useState<SubmissionEvaluation | null>(null)

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

  const handleStartQuiz = (quiz: EnrolledQuiz) => {
    setActiveQuiz(quiz)
    setCurrentQuestionIdx(0)
    setSelectedAnswers({})
    setSubmissionResult(null)
  }

  const handleSelectAnswer = (qId: string, ans: string) => {
    if (submissionResult) return
    setSelectedAnswers((prev) => ({ ...prev, [qId]: ans }))
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

      setSubmissionResult(data.submission)
      fetchEnrolledQuizzes() // Refresh completed statuses

      toast({
        title: 'Quiz Evaluated & Recorded! 🎉',
        description: `Score: ${data.submission.score}/${data.submission.total} (${data.submission.percentage}%). Concept mastery updated in PostgreSQL.`,
      })
    } catch {
      toast({ title: 'Error', description: 'Could not submit quiz for evaluation.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const pendingQuizzes = quizzes.filter((q) => !q.isCompleted)
  const completedQuizzes = quizzes.filter((q) => q.isCompleted)

  return (
    <div className="space-y-8">
      {/* Header */}
      <PageHeader
        title="Assigned Quizzes & Formative Assessments"
        description="Take concept-mapped quizzes published by your teachers. Receive instant diagnostics, view explanations, and review misconceptions with your AI Socratic Tutor."
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
                    <Button onClick={() => handleStartQuiz(quiz)} className="gap-1.5 shadow-sm text-xs">
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
                    onClick={() => handleStartQuiz(q)}
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

      {/* Interactive Quiz Taking Modal */}
      {activeQuiz && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 flex flex-col">
            {/* Modal Header */}
            <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-4 bg-muted/20">
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="text-xs">
                    {activeQuiz.subject}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    Question {currentQuestionIdx + 1} of {activeQuiz.questions.length}
                  </span>
                </div>
                <CardTitle className="mt-1 text-base font-bold">{activeQuiz.title}</CardTitle>
              </div>
              <Button variant="ghost" size="icon-sm" onClick={() => setActiveQuiz(null)}>
                ✕
              </Button>
            </CardHeader>

            {/* Modal Body */}
            <CardContent className="space-y-6 pt-6 flex-1 text-sm">
              {activeQuiz.questions.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">No questions in this quiz.</div>
              ) : !submissionResult ? (
                /* Interactive Question View */
                <div className="space-y-5">
                  {(() => {
                    const q = activeQuiz.questions[currentQuestionIdx]
                    return (
                      <>
                        <div className="flex items-start gap-3">
                          <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                            {currentQuestionIdx + 1}
                          </span>
                          <div className="space-y-1">
                            <p className="font-medium text-foreground text-base leading-snug">
                              {q.question}
                            </p>
                            {q.concept && (
                              <Badge variant="outline" className="text-[10px]">
                                Concept: {q.concept}
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Options */}
                        {q.options && q.options.length > 0 ? (
                          <div className="space-y-2.5 pl-10">
                            {q.options.map((opt, i) => {
                              const isSelected = selectedAnswers[q.id] === opt
                              return (
                                <button
                                  key={i}
                                  onClick={() => handleSelectAnswer(q.id, opt)}
                                  className={`flex w-full items-center gap-3 rounded-xl border p-3.5 text-xs text-left transition-all ${
                                    isSelected
                                      ? 'border-primary bg-primary/10 font-bold text-primary ring-2 ring-primary/20'
                                      : 'border-border bg-card text-foreground hover:bg-muted/40'
                                  }`}
                                >
                                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted font-bold text-[11px]">
                                    {String.fromCharCode(65 + i)}
                                  </span>
                                  <span className="flex-1">{opt}</span>
                                </button>
                              )
                            })}
                          </div>
                        ) : (
                          /* Short Answer text input */
                          <div className="pl-10 space-y-2">
                            <label className="text-xs font-semibold text-muted-foreground">
                              Type your answer below:
                            </label>
                            <input
                              type="text"
                              value={selectedAnswers[q.id] || ''}
                              onChange={(e) => handleSelectAnswer(q.id, e.target.value)}
                              placeholder="e.g. 1:1, Foreign Key, Entity Set..."
                              className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2"
                            />
                          </div>
                        )}
                      </>
                    )
                  })()}

                  {/* Question Navigator */}
                  <div className="flex items-center justify-between border-t border-border pt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentQuestionIdx((prev) => Math.max(0, prev - 1))}
                      disabled={currentQuestionIdx === 0}
                      className="text-xs"
                    >
                      Previous
                    </Button>

                    <div className="flex gap-1.5">
                      {activeQuiz.questions.map((q, idx) => (
                        <button
                          key={q.id}
                          onClick={() => setCurrentQuestionIdx(idx)}
                          className={`size-6 rounded-full text-[11px] font-bold transition-colors ${
                            currentQuestionIdx === idx
                              ? 'bg-primary text-primary-foreground'
                              : selectedAnswers[q.id]
                                ? 'bg-muted-foreground/30 text-foreground'
                                : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {idx + 1}
                        </button>
                      ))}
                    </div>

                    {currentQuestionIdx < activeQuiz.questions.length - 1 ? (
                      <Button
                        size="sm"
                        onClick={() =>
                          setCurrentQuestionIdx((prev) =>
                            Math.min(activeQuiz.questions.length - 1, prev + 1),
                          )
                        }
                        className="text-xs"
                      >
                        Next
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={handleSubmitQuiz}
                        disabled={
                          Object.keys(selectedAnswers).length < activeQuiz.questions.length || isSubmitting
                        }
                        className="gap-1.5 shadow-sm text-xs bg-success hover:bg-success/90"
                      >
                        <CheckCircle2 className="size-4" />
                        {isSubmitting ? 'Evaluating…' : 'Submit Answers'}
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                /* Instant AI Evaluation Results View */
                <div className="space-y-6">
                  {/* Score Banner */}
                  <div className="flex flex-col items-center justify-center gap-3 rounded-2xl bg-muted/40 p-6 text-center border border-border">
                    <DonutChart
                      value={submissionResult.percentage}
                      size={100}
                      stroke={10}
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
                      <p className="text-xs text-muted-foreground">
                        You scored {submissionResult.score} of {submissionResult.total} marks ({submissionResult.percentage}%).
                        Your progress analytics have been recorded in PostgreSQL.
                      </p>
                    </div>

                    {submissionResult.identifiedGaps.length > 0 && (
                      <div className="mt-2 rounded-xl bg-destructive/10 p-3 text-xs text-destructive">
                        <strong>Identified Gaps: </strong>
                        {submissionResult.identifiedGaps.join(', ')}
                      </div>
                    )}
                  </div>

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
                          <div className="flex items-start gap-2">
                            {cr.correct ? (
                              <CheckCircle2 className="size-4 text-success shrink-0 mt-0.5" />
                            ) : (
                              <XCircle className="size-4 text-destructive shrink-0 mt-0.5" />
                            )}
                            <p className="font-medium text-foreground">
                              {idx + 1}. {cr.questionText}
                            </p>
                          </div>
                          <Badge
                            variant={cr.correct ? 'success' : 'destructive'}
                            className="text-[10px]"
                          >
                            {cr.correct ? 'Correct' : 'Needs Review'}
                          </Badge>
                        </div>

                        <div className="pl-6 space-y-1 text-muted-foreground">
                          <p>
                            Your answer: <strong className="text-foreground">{cr.userAnswer || 'None'}</strong>
                          </p>
                          {!cr.correct && (
                            <p>
                              Correct answer: <strong className="text-success">{cr.correctAnswer}</strong>
                            </p>
                          )}
                          <p className="pt-1 text-foreground">
                            <strong>Explanation: </strong>
                            {cr.explanation}
                          </p>
                        </div>

                        {!cr.correct && (
                          <div className="pl-6 pt-1">
                            <Link
                              href={`/student/tutor?prompt=${encodeURIComponent(
                                `I got this question wrong on ${activeQuiz.topic}: "${cr.questionText}". Can you explain why the correct answer is "${cr.correctAnswer}"?`,
                              )}`}
                            >
                              <Button variant="ghost" size="xs" className="gap-1 text-xs text-primary">
                                <MessageSquareText className="size-3" />
                                Ask AI Socratic Tutor about this concept
                              </Button>
                            </Link>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap justify-between gap-2 border-t border-border pt-4">
                    <Button variant="outline" size="sm" onClick={() => setActiveQuiz(null)}>
                      Close Assessment
                    </Button>
                    <Link href="/student/progress">
                      <Button size="sm" className="gap-1.5 shadow-sm text-xs">
                        View Updated Mastery Progress
                        <ArrowRight className="size-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
