'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Boxes,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  ExternalLink,
  Eye,
  GraduationCap,
  HelpCircle,
  Layers,
  Lightbulb,
  MessageSquareText,
  Play,
  RefreshCw,
  Rocket,
  RotateCw,
  Sparkles,
  Target,
  Trophy,
  Zap,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LevelBadge } from '@/components/shared/badges'
import { resources } from '@/lib/mock-data'
import { useAppSession } from '@/lib/session-context'
import type {
  AdaptiveTrack,
  LearningLevel,
  PersonalizedPracticeSet,
  PracticeQuestion,
  PracticeEvaluationResult,
} from '@/lib/types'
import { useToast } from '@/components/shared/toast'

export default function StudentLearningPage() {
  const { toast } = useToast()
  const {
    selectedTopic,
    setSelectedTopic,
    getAdaptiveTracksForTopic,
    studentUser,
  } = useAppSession()

  const [selectedLevel, setSelectedLevel] = React.useState<LearningLevel>(studentUser.level || 'Standard')
  const [tracks, setTracks] = React.useState<AdaptiveTrack[]>([])
  const [showSolution, setShowSolution] = React.useState(false)
  const [enrolledTopics, setEnrolledTopics] = React.useState<string[]>([])

  // Load enrolled class syllabus topics and published lessons
  React.useEffect(() => {
    const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
    const topicParam = urlParams ? urlParams.get('topic') : null

    Promise.all([
      fetch('/api/classes/enrolled').then((r) => (r.ok ? r.json() : null)),
      fetch('/api/lesson-plans').then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([classData, lessonData]) => {
        const topicSet = new Set<string>()
        if (classData?.classes) {
          classData.classes.forEach((c: any) => {
            if (Array.isArray(c.topics)) {
              c.topics.forEach((top: any) => {
                const title = typeof top === 'string' ? top : top?.title
                if (title) topicSet.add(title)
              })
            }
          })
        }
        if (lessonData?.lessonPlans) {
          lessonData.lessonPlans.forEach((lp: any) => {
            if (lp.topic) topicSet.add(lp.topic)
          })
        }

        const topics = Array.from(topicSet)
        if (topics.length > 0) {
          setEnrolledTopics(topics)
          if (topicParam && topics.includes(topicParam)) {
            setSelectedTopic(topicParam)
          } else if (topicParam) {
            setEnrolledTopics([topicParam, ...topics])
            setSelectedTopic(topicParam)
          } else if (!topics.includes(selectedTopic)) {
            setSelectedTopic(topics[0])
          }
        } else if (topicParam) {
          setEnrolledTopics([topicParam])
          setSelectedTopic(topicParam)
        } else {
          setEnrolledTopics([selectedTopic || 'ER Model'])
        }
      })
      .catch(() => {
        if (topicParam) {
          setEnrolledTopics([topicParam])
          setSelectedTopic(topicParam)
        }
      })
  }, [])

  // Personalized Practice Generator states
  const [isGeneratingPractice, setIsGeneratingPractice] = React.useState(false)
  const [isEvaluatingPractice, setIsEvaluatingPractice] = React.useState(false)
  const [practiceSet, setPracticeSet] = React.useState<PersonalizedPracticeSet | null>(null)
  const [practiceAnswers, setPracticeAnswers] = React.useState<Record<string, string>>({})
  const [practiceResult, setPracticeResult] = React.useState<PracticeEvaluationResult | null>(null)
  const [insufficientDataMsg, setInsufficientDataMsg] = React.useState<string | null>(null)
  const [completedQuestionTexts, setCompletedQuestionTexts] = React.useState<string[]>([])

  React.useEffect(() => {
    loadTracks(selectedTopic)
    // Reset practice states on topic change
    setPracticeSet(null)
    setPracticeAnswers({})
    setPracticeResult(null)
    setInsufficientDataMsg(null)
  }, [selectedTopic])

  const loadTracks = async (t: string) => {
    try {
      const res = await getAdaptiveTracksForTopic(t)
      setTracks(res)
    } catch (err) {
      toast({
        title: 'Could not load tracks',
        description: err instanceof Error ? err.message : 'Failed to load adaptive tracks.',
      })
    }
  }

  const activeTrack = tracks.find((t) => t.level === selectedLevel) || tracks[0]

  // Generate Personalized Practice using Gemini AI
  const handleGeneratePractice = async (force = false) => {
    setIsGeneratingPractice(true)
    setInsufficientDataMsg(null)
    setPracticeResult(null)
    setPracticeAnswers({})

    try {
      const res = await fetch('/api/practice/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: selectedTopic,
          numberOfQuestions: 5,
          forceGenerate: force,
          previousQuestionTexts: completedQuestionTexts,
        }),
      })

      const data = await res.json()

      if (data.insufficientData) {
        setInsufficientDataMsg(data.message)
        return
      }

      if (!res.ok || !data.success) {
        toast({
          title: 'Practice Generation Failed',
          description: data.error || 'Could not generate personalized practice at this time.',
        })
        return
      }

      setPracticeSet(data.practiceSet)
      toast({
        title: 'Personalized Practice Ready! ✨',
        description: `Generated ${data.practiceSet.questions.length} targeted questions targeting your learning needs.`,
      })
    } catch (err) {
      toast({
        title: 'Network Error',
        description: err instanceof Error ? err.message : 'Failed to connect to practice service.',
      })
    } finally {
      setIsGeneratingPractice(false)
    }
  }

  // Deterministically Evaluate Practice
  const handleSubmitPractice = async () => {
    if (!practiceSet) return
    setIsEvaluatingPractice(true)

    try {
      const res = await fetch('/api/practice/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: selectedTopic,
          answers: practiceAnswers,
          questions: practiceSet.questions,
        }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        toast({
          title: 'Evaluation Error',
          description: data.error || 'Failed to score practice submission.',
        })
        return
      }

      setPracticeResult(data)

      // Add questions to exclude list for next iteration
      const newQuestionTexts = practiceSet.questions.map((q) => q.question)
      setCompletedQuestionTexts((prev) => [...prev, ...newQuestionTexts])

      toast({
        title: 'Practice Evaluated! 🎉',
        description: `Score: ${data.score}/${data.total} (${data.percentage}%). Topic mastery updated!`,
      })
    } catch (err) {
      toast({
        title: 'Evaluation Failed',
        description: err instanceof Error ? err.message : 'Could not submit answers.',
      })
    } finally {
      setIsEvaluatingPractice(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <PageHeader
        title="My Adaptive Learning & Targeted Practice"
        description="Learn at your own pace with teacher-approved tracks, interactive worked demonstrations, and targeted practice generated specifically for your learning gaps."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/student/tutor?prompt=${encodeURIComponent(`Can you explain ${selectedTopic} in simple terms?`)}`}>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                <MessageSquareText className="size-4" />
                Ask AI Tutor
              </Button>
            </Link>
            <Link href={`/student/quizzes?topic=${encodeURIComponent(selectedTopic)}`}>
              <Button size="sm" className="gap-1.5 shadow-sm">
                <Zap className="size-4" />
                Take Assigned Quiz
              </Button>
            </Link>
          </div>
        }
      />

      {/* Topic and Track Selector Bar */}
      <Card className="border-border bg-card p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Current Topic:
            </span>
            {enrolledTopics.length === 0 ? (
              <span className="text-xs font-medium text-foreground">{selectedTopic || 'General'}</span>
            ) : (
              <select
                value={selectedTopic}
                onChange={(e) => {
                  setSelectedTopic(e.target.value)
                  setShowSolution(false)
                }}
                className="h-8 rounded-lg border border-input bg-card px-2.5 text-xs font-semibold outline-none focus-visible:border-ring"
              >
                {enrolledTopics.map((top) => (
                  <option key={top} value={top}>
                    {top}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/30 p-1">
            <span className="px-2 text-xs font-medium text-muted-foreground">Track:</span>
            {(['Remedial', 'Standard', 'Advanced'] as LearningLevel[]).map((level) => {
              const isSelected = selectedLevel === level
              return (
                <button
                  key={level}
                  onClick={() => {
                    setSelectedLevel(level)
                    setShowSolution(false)
                  }}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                    isSelected
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {level === 'Remedial' && <Layers className="size-3 text-warning-foreground" />}
                  {level === 'Standard' && <GraduationCap className="size-3 text-primary" />}
                  {level === 'Advanced' && <Rocket className="size-3 text-success" />}
                  <span>{level}</span>
                  {level === 'Standard' && (
                    <span className="ml-1 rounded bg-primary/10 px-1 py-0.2 text-[9px] text-primary font-mono">
                      Current
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </Card>

      {/* Main Adaptive Lesson Reader */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Lesson Body (8 cols) */}
        <div className="space-y-6 lg:col-span-8">
          <Card className="border-primary/30 shadow-sm">
            <CardHeader className="border-b border-border pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <LevelBadge level={selectedLevel} />
                  <Badge variant="outline" className="text-xs">
                    {selectedTopic}
                  </Badge>
                </div>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="size-3.5" /> 15 min session
                </span>
              </div>
              <CardTitle className="mt-2 text-xl font-bold">
                {activeTrack?.description || activeTrack?.summary || `${selectedTopic} — ${selectedLevel} Track`}
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-6 pt-6 text-sm leading-relaxed">
              {/* Section 1: Conceptual Foundation */}
              <div>
                <h3 className="font-display text-base font-bold text-foreground">
                  1. Core Conceptual Strategy & Explanation
                </h3>
                <div className="mt-2 space-y-2 text-muted-foreground text-xs leading-relaxed">
                  <p className="whitespace-pre-line">{activeTrack?.explanation || activeTrack?.summary || 'Loading lesson track…'}</p>
                </div>

                {/* Key Teaching Points */}
                <div className="mt-4 space-y-2 rounded-xl border border-border bg-muted/20 p-4">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Key Concept Highlights
                  </h4>
                  <ul className="space-y-1.5 text-xs text-muted-foreground">
                    {activeTrack?.points.map((pt, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle2 className="size-3.5 text-primary shrink-0 mt-0.5" />
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Remedial Misconceptions */}
                {activeTrack?.level === 'Remedial' && activeTrack?.misconceptionsToAddress && activeTrack.misconceptionsToAddress.length > 0 && (
                  <div className="mt-3 rounded-xl border border-warning/30 bg-warning/[0.04] p-3 text-xs">
                    <h4 className="font-semibold text-warning-foreground uppercase tracking-wider text-[11px] mb-1">
                      Common Misconceptions Addressed
                    </h4>
                    <ul className="space-y-1 text-muted-foreground">
                      {activeTrack.misconceptionsToAddress.map((m, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <span className="font-bold text-warning-foreground">•</span>
                          <span>{m}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Advanced Extensions */}
                {activeTrack?.level === 'Advanced' && activeTrack?.extensionActivities && activeTrack.extensionActivities.length > 0 && (
                  <div className="mt-3 rounded-xl border border-success/30 bg-success/[0.04] p-3 text-xs">
                    <h4 className="font-semibold text-success uppercase tracking-wider text-[11px] mb-1">
                      Advanced Extension Challenges
                    </h4>
                    <ul className="space-y-1 text-muted-foreground">
                      {activeTrack.extensionActivities.map((e, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <span className="font-bold text-success">•</span>
                          <span>{e}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Section 2: Interactive Worked Example */}
              <div className="rounded-xl border border-border bg-card p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-base font-bold text-foreground">
                    2. Guided Demonstration Model
                  </h3>
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => setShowSolution(!showSolution)}
                    className="gap-1 text-xs text-primary"
                  >
                    {showSolution ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                    {showSolution ? 'Hide Model' : 'Reveal Step-by-Step Model'}
                  </Button>
                </div>

                <p className="text-muted-foreground text-xs leading-relaxed whitespace-pre-line">
                  {activeTrack?.example}
                </p>
              </div>

              {/* Section 3: REAL AI PERSONALIZED PRACTICE GENERATOR */}
              <div className="rounded-2xl border-2 border-primary/30 bg-card p-6 space-y-5 shadow-sm">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Target className="size-4.5" />
                    </div>
                    <div>
                      <h3 className="font-display text-base font-bold text-foreground">
                        Personalized AI Practice Generator
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Targeted questions synthesized from your assessment results, diagnosed gaps, and misconceptions.
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs font-mono self-start sm:self-auto">
                    Live Gemini Engine
                  </Badge>
                </div>

                {/* State A: Insufficient Data Alert */}
                {insufficientDataMsg && (
                  <div className="rounded-xl border border-warning/30 bg-warning/[0.04] p-4 space-y-3 text-xs">
                    <div className="flex items-center gap-2 font-bold text-warning-foreground">
                      <AlertCircle className="size-4" />
                      <span>Diagnostic Baseline Needed</span>
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
                        onClick={() => handleGeneratePractice(true)}
                        className="text-xs"
                      >
                        Generate Practice Anyway
                      </Button>
                    </div>
                  </div>
                )}

                {/* State B: Initial CTA Banner (when no practice active) */}
                {!practiceSet && !insufficientDataMsg && (
                  <div className="rounded-xl bg-muted/20 border border-border p-5 space-y-4">
                    <div className="space-y-1">
                      <h4 className="font-bold text-sm text-foreground">Ready for Targeted Skill Practice?</h4>
                      <p className="text-xs text-muted-foreground">
                        Gemini will review your performance on <strong>{selectedTopic}</strong> and formulate 5 focused questions targeting your exact areas of cognitive confusion.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Layers className="size-3.5 text-primary" /> Target Level: <strong>{selectedLevel}</strong>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="size-3.5 text-primary" /> ~10 mins
                      </span>
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="size-3.5 text-success" /> Rule-Based Deterministic Scoring
                      </span>
                    </div>

                    <Button
                      onClick={() => handleGeneratePractice(false)}
                      disabled={isGeneratingPractice}
                      className="gap-2 shadow-sm font-semibold text-xs"
                    >
                      <Sparkles className={`size-4 ${isGeneratingPractice ? 'animate-spin' : ''}`} />
                      {isGeneratingPractice ? 'Generating Targeted Questions with Gemini...' : 'Practice My Weak Areas'}
                    </Button>
                  </div>
                )}

                {/* State C: Active Interactive Practice Test */}
                {practiceSet && !practiceResult && (
                  <div className="space-y-6 animate-in fade-in">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between bg-primary/5 rounded-xl p-4 border border-primary/20">
                      <div>
                        <h4 className="font-bold text-sm text-foreground">{practiceSet.title}</h4>
                        <p className="text-xs text-muted-foreground">{practiceSet.reason}</p>
                      </div>
                      <Badge variant="default" className="text-xs shrink-0">
                        {practiceSet.recommendedTier} Level
                      </Badge>
                    </div>

                    {/* Question List */}
                    <div className="space-y-4">
                      {practiceSet.questions.map((q, idx) => (
                        <div
                          key={q.id}
                          className="rounded-xl border border-border bg-card p-4 space-y-3 text-xs shadow-2xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-foreground">
                              Question {idx + 1} of {practiceSet.questions.length}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <Badge variant="outline" className="text-[10px]">
                                {q.concept}
                              </Badge>
                              <Badge variant="secondary" className="text-[10px]">
                                {q.difficulty}
                              </Badge>
                            </div>
                          </div>

                          <p className="font-medium text-foreground text-sm leading-relaxed">{q.question}</p>

                          {/* Multiple Choice Options */}
                          {q.type === 'MCQ' && q.options && (
                            <div className="grid gap-2 pt-1">
                              {q.options.map((opt, oIdx) => {
                                const isSelected = practiceAnswers[q.id] === opt
                                return (
                                  <button
                                    key={oIdx}
                                    type="button"
                                    onClick={() =>
                                      setPracticeAnswers((prev) => ({ ...prev, [q.id]: opt }))
                                    }
                                    className={`flex items-center gap-3 rounded-lg border p-2.5 text-left text-xs transition-all ${
                                      isSelected
                                        ? 'border-primary bg-primary/10 text-primary font-semibold'
                                        : 'border-border bg-background hover:border-primary/40'
                                    }`}
                                  >
                                    <span className="flex size-5 items-center justify-center rounded-full border text-[10px] font-mono shrink-0">
                                      {String.fromCharCode(65 + oIdx)}
                                    </span>
                                    <span>{opt}</span>
                                  </button>
                                )
                              })}
                            </div>
                          )}

                          {/* True/False Options */}
                          {q.type === 'True/False' && (
                            <div className="flex gap-3 pt-1">
                              {['True', 'False'].map((tf) => {
                                const isSelected = practiceAnswers[q.id] === tf
                                return (
                                  <button
                                    key={tf}
                                    type="button"
                                    onClick={() =>
                                      setPracticeAnswers((prev) => ({ ...prev, [q.id]: tf }))
                                    }
                                    className={`flex-1 rounded-lg border p-2.5 text-center text-xs font-semibold transition-all ${
                                      isSelected
                                        ? 'border-primary bg-primary/10 text-primary'
                                        : 'border-border bg-background hover:border-primary/40'
                                    }`}
                                  >
                                    {tf}
                                  </button>
                                )
                              })}
                            </div>
                          )}

                          {/* Short Answer */}
                          {q.type === 'Short Answer' && (
                            <input
                              type="text"
                              value={practiceAnswers[q.id] || ''}
                              onChange={(e) =>
                                setPracticeAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))
                              }
                              placeholder="Type your answer here..."
                              className="w-full rounded-lg border border-input bg-background p-2.5 text-xs text-foreground outline-none focus-visible:border-ring"
                            />
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between border-t border-border pt-4">
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => setPracticeSet(null)}
                        className="text-xs text-muted-foreground"
                      >
                        Cancel Practice
                      </Button>

                      <Button
                        onClick={handleSubmitPractice}
                        disabled={isEvaluatingPractice || Object.keys(practiceAnswers).length === 0}
                        className="gap-2 shadow-sm font-semibold text-xs"
                      >
                        <Check className="size-4" />
                        {isEvaluatingPractice ? 'Scoring Deterministically...' : 'Submit Practice for Evaluation'}
                      </Button>
                    </div>
                  </div>
                )}

                {/* State D: Deterministic Results & Learning Feedback */}
                {practiceResult && (
                  <div className="space-y-5 animate-in zoom-in-95">
                    {/* Score Summary Banner */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between rounded-xl bg-muted/30 border border-border p-5 gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <Trophy className="size-5 text-primary" />
                          <h4 className="font-bold text-sm text-foreground">Personalized Practice Evaluated</h4>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{practiceResult.summary}</p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xs uppercase font-semibold text-muted-foreground">Score</span>
                        <div className="text-2xl font-black text-primary font-mono">
                          {practiceResult.score} / {practiceResult.total} ({practiceResult.percentage}%)
                        </div>
                      </div>
                    </div>

                    {/* Mastered vs Needs Work Badges */}
                    <div className="grid gap-3 sm:grid-cols-2 text-xs">
                      {practiceResult.conceptsMastered.length > 0 && (
                        <div className="rounded-xl border border-success/30 bg-success/[0.02] p-3.5 space-y-1.5">
                          <span className="font-bold text-success uppercase text-[11px] flex items-center gap-1">
                            <CheckCircle2 className="size-3.5" /> Concepts Mastered
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {practiceResult.conceptsMastered.map((c, i) => (
                              <Badge key={i} variant="success" className="text-[10px]">
                                {c}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {practiceResult.conceptsStillWeak.length > 0 && (
                        <div className="rounded-xl border border-destructive/30 bg-destructive/[0.02] p-3.5 space-y-1.5">
                          <span className="font-bold text-destructive uppercase text-[11px] flex items-center gap-1">
                            <AlertTriangle className="size-3.5" /> Needs More Practice
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {practiceResult.conceptsStillWeak.map((c, i) => (
                              <Badge key={i} variant="destructive" className="text-[10px]">
                                {c}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Step-by-Step Question Breakdown */}
                    <div className="space-y-3">
                      <h5 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
                        Question-by-Question Explanations
                      </h5>
                      {practiceResult.results.map((r, i) => (
                        <div
                          key={i}
                          className={`rounded-xl border p-4 space-y-2 text-xs ${
                            r.correct ? 'border-success/30 bg-success/[0.01]' : 'border-destructive/30 bg-destructive/[0.01]'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-foreground">Question {i + 1}</span>
                              <Badge variant={r.correct ? 'success' : 'destructive'} className="text-[10px]">
                                {r.correct ? '✓ Correct' : '✗ Incorrect'}
                              </Badge>
                            </div>
                            <span className="text-muted-foreground">{r.concept}</span>
                          </div>

                          <p className="font-medium text-foreground">{r.question}</p>

                          <div className="grid gap-1.5 sm:grid-cols-2 pt-1">
                            <div className="rounded-lg bg-background p-2 border border-border">
                              <span className="text-muted-foreground block text-[10px]">Your Answer:</span>
                              <span className={r.correct ? 'text-success font-semibold' : 'text-destructive font-semibold'}>
                                {r.studentAnswer || 'No answer'}
                              </span>
                            </div>
                            <div className="rounded-lg bg-background p-2 border border-border">
                              <span className="text-muted-foreground block text-[10px]">Correct Answer:</span>
                              <span className="text-success font-semibold">{r.correctAnswer}</span>
                            </div>
                          </div>

                          <p className="text-muted-foreground pt-1 leading-relaxed">
                            <strong>Explanation:</strong> {r.explanation}
                          </p>
                        </div>
                      ))}
                    </div>

                    {/* Action Bar */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-border pt-4">
                      <p className="text-xs text-muted-foreground">
                        {practiceResult.recommendedNextStep}
                      </p>

                      <Button
                        onClick={() => handleGeneratePractice(true)}
                        disabled={isGeneratingPractice}
                        className="gap-2 text-xs font-semibold shadow-sm shrink-0"
                      >
                        <RotateCw className={`size-3.5 ${isGeneratingPractice ? 'animate-spin' : ''}`} />
                        {isGeneratingPractice ? 'Generating Next Set...' : 'Generate Another Targeted Practice Set'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Lesson Completion Action */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                <p className="text-xs text-muted-foreground">
                  Finished reading? Test your understanding with the assigned formative quiz.
                </p>
                <Link href={`/student/quizzes?topic=${encodeURIComponent(selectedTopic)}`}>
                  <Button className="gap-2 shadow-sm">
                    Take Assigned Quiz
                    <ArrowRight className="size-4" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: AI Matched Supplemental Resources (4 cols) */}
        <div className="space-y-4 lg:col-span-4">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            <h3 className="font-display text-sm font-bold">Matched Media & Cheat Sheets</h3>
          </div>

          <div className="space-y-3">
            {resources.map((res) => (
              <Card key={res.id} className="p-4 transition-all hover:border-primary/40">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <Badge variant="outline" className="text-[10px]">
                      {res.type}
                    </Badge>
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Clock className="size-3" />
                      {res.estMinutes} min
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold text-foreground">{res.title}</h4>
                  <p className="text-xs text-muted-foreground">{res.reason}</p>
                  <div className="pt-2">
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() =>
                        toast({
                          title: `Opening resource: ${res.title}`,
                          description: 'Interactive media player loaded.',
                        })
                      }
                      className="gap-1 text-xs text-primary"
                    >
                      <Play className="size-3" />
                      Open Resource
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
