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
import { useAppSession } from '@/lib/session-context'
import type { QuizQuestion, QuizSubmission } from '@/lib/types'
import { useToast } from '@/components/shared/toast'

export default function StudentQuizzesPage() {
  const { toast } = useToast()
  const {
    selectedTopic,
    getQuizForTopic,
    submitStudentQuiz,
    studentQuizResults,
    latestQuizSubmission,
  } = useAppSession()

  // Active quiz state
  const [activeQuizTitle, setActiveQuizTitle] = React.useState<string | null>(null)
  const [currentQuestionIdx, setCurrentQuestionIdx] = React.useState(0)
  const [selectedAnswers, setSelectedAnswers] = React.useState<Record<number, string>>({})
  const [quizQuestions, setQuizQuestions] = React.useState<QuizQuestion[]>([])
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [submissionResult, setSubmissionResult] = React.useState<QuizSubmission | null>(null)

  const handleStartQuiz = async (title: string, topic = selectedTopic) => {
    setActiveQuizTitle(title)
    setCurrentQuestionIdx(0)
    setSelectedAnswers({})
    setSubmissionResult(null)
    const questions = await getQuizForTopic(topic, 4)
    setQuizQuestions(questions)
  }

  const handleSelectAnswer = (ans: string) => {
    if (submissionResult) return
    setSelectedAnswers((prev) => ({ ...prev, [currentQuestionIdx]: ans }))
  }

  const handleSubmitQuiz = async () => {
    setIsSubmitting(true)
    try {
      const res = await submitStudentQuiz(selectedTopic, selectedAnswers, quizQuestions)
      setSubmissionResult(res)
      toast({
        title: 'Quiz submitted & evaluated by AI! 🎉',
        description: `You scored ${res.score}/${res.total} (${res.percentage}%). Concept diagnostics and recommendations updated!`,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <PageHeader
        title="Formative Assessments & Concept Mastery"
        description="Take adaptive practice quizzes, receive instant AI evaluation, diagnose misconceptions, and review with the AI Tutor."
      />

      {/* Available Quizzes Grid */}
      <div className="space-y-4">
        <h2 className="font-display text-lg font-bold">Assigned Quizzes Ready to Take</h2>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Active Topic Quiz Card */}
          <Card className="border-primary/40 bg-card p-5 transition-all hover:shadow-md">
            <div className="flex flex-col justify-between h-full space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <LevelBadge level="Standard" />
                  <Badge variant="default" className="text-xs">
                    Assigned by Teacher
                  </Badge>
                </div>
                <h3 className="text-lg font-bold text-foreground">
                  {selectedTopic} — Formative Check Assessment
                </h3>
                <p className="text-xs text-muted-foreground">
                  4 concept-mapped questions covering core definitions, cardinality, and applied problem solving.
                </p>
              </div>

              <div className="flex items-center justify-between border-t border-border pt-4 text-xs">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="size-3.5" /> 8 min
                </span>
                <Button
                  onClick={() =>
                    handleStartQuiz(`${selectedTopic} — Formative Check Assessment`, selectedTopic)
                  }
                  className="gap-1.5 shadow-sm"
                >
                  <Play className="size-3.5 fill-current" />
                  Start Quiz
                </Button>
              </div>
            </div>
          </Card>

          {/* Secondary Quiz Card */}
          <Card className="border-border bg-card p-5 transition-all hover:shadow-md">
            <div className="flex flex-col justify-between h-full space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <LevelBadge level="Remedial" />
                  <Badge variant="warning" className="text-xs">
                    Recommended to close gap
                  </Badge>
                </div>
                <h3 className="text-lg font-bold text-foreground">
                  Trigonometric Identities — Foundation Check
                </h3>
                <p className="text-xs text-muted-foreground">
                  4 targeted questions covering unit circle derivations, squaring notation, and Pythagorean substitution.
                </p>
              </div>

              <div className="flex items-center justify-between border-t border-border pt-4 text-xs">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="size-3.5" /> 8 min
                </span>
                <Button
                  variant="outline"
                  onClick={() =>
                    handleStartQuiz(
                      'Trigonometric Identities — Foundation Check',
                      'Trigonometric Identities',
                    )
                  }
                  className="gap-1.5"
                >
                  <Play className="size-3.5" />
                  Start Quiz
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Completed Quizzes History */}
      <div className="space-y-4 pt-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">Completed Assessment History (Live)</h2>
          <span className="text-xs text-muted-foreground">
            {studentQuizResults.length} assessments completed
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {studentQuizResults.map((q) => (
            <Card key={q.id} className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-foreground text-sm">{q.title}</h4>
                  <p className="text-xs text-muted-foreground">{q.date}</p>
                </div>
                <Badge
                  variant={q.score >= 75 ? 'success' : q.score >= 60 ? 'default' : 'destructive'}
                  className="font-mono text-sm"
                >
                  {q.score}%
                </Badge>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Interactive Quiz Taking Modal */}
      {activeQuizTitle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 flex flex-col">
            {/* Modal Header */}
            <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-4 bg-muted/20">
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="text-xs">
                    Interactive Assessment
                  </Badge>
                  {quizQuestions.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      Question {currentQuestionIdx + 1} of {quizQuestions.length}
                    </span>
                  )}
                </div>
                <CardTitle className="mt-1 text-base font-bold">{activeQuizTitle}</CardTitle>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setActiveQuizTitle(null)}
              >
                ✕
              </Button>
            </CardHeader>

            {/* Modal Body */}
            <CardContent className="space-y-6 pt-6 flex-1 text-sm">
              {quizQuestions.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">Loading quiz questions…</div>
              ) : !submissionResult ? (
                /* Question View */
                <div className="space-y-5">
                  <div className="flex items-start gap-3">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                      {currentQuestionIdx + 1}
                    </span>
                    <div className="space-y-1">
                      <p className="font-medium text-foreground text-base leading-snug">
                        {quizQuestions[currentQuestionIdx].question}
                      </p>
                      {quizQuestions[currentQuestionIdx].concept && (
                        <Badge variant="outline" className="text-[10px]">
                          Concept: {quizQuestions[currentQuestionIdx].concept}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Options */}
                  {quizQuestions[currentQuestionIdx].options ? (
                    <div className="space-y-2.5 pl-10">
                      {quizQuestions[currentQuestionIdx].options?.map((opt, i) => {
                        const isSelected = selectedAnswers[currentQuestionIdx] === opt
                        return (
                          <button
                            key={i}
                            onClick={() => handleSelectAnswer(opt)}
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
                        value={selectedAnswers[currentQuestionIdx] || ''}
                        onChange={(e) => handleSelectAnswer(e.target.value)}
                        placeholder="e.g. 1:1, sin θ, Foreign Key..."
                        className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2"
                      />
                    </div>
                  )}

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
                      {quizQuestions.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setCurrentQuestionIdx(idx)}
                          className={`size-6 rounded-full text-[11px] font-bold transition-colors ${
                            currentQuestionIdx === idx
                              ? 'bg-primary text-primary-foreground'
                              : selectedAnswers[idx]
                                ? 'bg-muted-foreground/30 text-foreground'
                                : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {idx + 1}
                        </button>
                      ))}
                    </div>

                    {currentQuestionIdx < quizQuestions.length - 1 ? (
                      <Button
                        size="sm"
                        onClick={() =>
                          setCurrentQuestionIdx((prev) =>
                            Math.min(quizQuestions.length - 1, prev + 1),
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
                          Object.keys(selectedAnswers).length < quizQuestions.length || isSubmitting
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
                          ? 'Concept Mastered! 🎉'
                          : 'Diagnostics Generated: Learning Gaps Identified 💡'}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        You answered {submissionResult.score} of {submissionResult.total} questions correctly. Your progress and teacher analytics have been updated.
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
                      Concept Breakdown & Detailed Explanations
                    </h4>

                    {quizQuestions.map((q, idx) => {
                      const userAns = selectedAnswers[idx]
                      const isCorrect =
                        userAns === q.answer ||
                        (userAns && userAns.trim().toLowerCase() === q.answer.trim().toLowerCase())
                      return (
                        <div
                          key={q.id}
                          className={`rounded-xl border p-4 space-y-2 text-xs ${
                            isCorrect ? 'border-success/30 bg-success/[0.02]' : 'border-destructive/30 bg-destructive/[0.02]'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2">
                              {isCorrect ? (
                                <CheckCircle2 className="size-4 text-success shrink-0 mt-0.5" />
                              ) : (
                                <XCircle className="size-4 text-destructive shrink-0 mt-0.5" />
                              )}
                              <p className="font-medium text-foreground">
                                {idx + 1}. {q.question}
                              </p>
                            </div>
                            <Badge variant={isCorrect ? 'success' : 'destructive'} className="text-[10px]">
                              {isCorrect ? 'Correct' : 'Needs Review'}
                            </Badge>
                          </div>

                          <div className="pl-6 space-y-1 text-muted-foreground">
                            <p>
                              Your answer: <strong className="text-foreground">{userAns || 'None'}</strong>
                            </p>
                            {!isCorrect && (
                              <p>
                                Correct answer: <strong className="text-success">{q.answer}</strong>
                              </p>
                            )}
                            <p className="pt-1 text-foreground">
                              <strong>Why: </strong>
                              {q.explanation}
                            </p>
                          </div>

                          {!isCorrect && (
                            <div className="pl-6 pt-1">
                              <Link
                                href={`/student/tutor?prompt=${encodeURIComponent(
                                  `I got this question wrong on ${selectedTopic}: "${q.question}". Can you explain why the answer is ${q.answer}?`,
                                )}`}
                              >
                                <Button variant="ghost" size="xs" className="gap-1 text-xs text-primary">
                                  <MessageSquareText className="size-3" />
                                  Ask AI Tutor about this error
                                </Button>
                              </Link>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  <div className="flex flex-wrap justify-between gap-2 border-t border-border pt-4">
                    <Button variant="outline" size="sm" onClick={() => setActiveQuizTitle(null)}>
                      Close Quiz
                    </Button>
                    <div className="flex items-center gap-2">
                      <Link href="/student/recommendations">
                        <Button size="sm" variant="outline" className="gap-1.5 text-xs">
                          <Sparkles className="size-3.5" />
                          View Updated Recommendations
                        </Button>
                      </Link>
                      <Link href="/student/progress">
                        <Button size="sm" className="gap-1.5 shadow-sm">
                          View Updated Progress
                          <ArrowRight className="size-4" />
                        </Button>
                      </Link>
                    </div>
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
