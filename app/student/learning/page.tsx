'use client'

import * as React from 'react'
import Link from 'next/link'
import {
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
  Rocket,
  Sparkles,
  Zap,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LevelBadge } from '@/components/shared/badges'
import { resources } from '@/lib/mock-data'
import { useAppSession } from '@/lib/session-context'
import type { AdaptiveTrack, LearningLevel } from '@/lib/types'
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
  const [practiceAnswer, setPracticeAnswer] = React.useState('')
  const [practiceSubmitted, setPracticeSubmitted] = React.useState(false)

  const isDBMS = selectedTopic.toLowerCase().includes('er') || selectedTopic.toLowerCase().includes('dbms')

  React.useEffect(() => {
    loadTracks(selectedTopic)
  }, [selectedTopic])

  const loadTracks = async (t: string) => {
    const res = await getAdaptiveTracksForTopic(t)
    setTracks(res)
  }

  const activeTrack = tracks.find((t) => t.level === selectedLevel) || tracks[0]

  const handleCheckAnswer = () => {
    setPracticeSubmitted(true)
    if (isDBMS) {
      if (practiceAnswer === 'C' || practiceAnswer.toLowerCase().includes('junction') || practiceAnswer.toLowerCase().includes('associative')) {
        toast({
          title: 'Correct answer! 🎉',
          description: 'You correctly identified that M:N relationships require a junction table to preserve 1NF.',
        })
      } else {
        toast({
          title: 'Review cardinality rule',
          description: 'Remember: A single foreign key in one table cannot represent Many-to-Many without multi-value columns. Try again!',
        })
      }
    } else {
      if (practiceAnswer === 'B' || practiceAnswer.toLowerCase().includes('4/5') || practiceAnswer.toLowerCase().includes('sin')) {
        toast({
          title: 'Correct answer! 🎉',
          description: 'You correctly applied the Pythagorean identity sin²θ + cos²θ = 1.',
        })
      } else {
        toast({
          title: 'Check your reasoning',
          description: 'Remember: 1 − cos²θ equals sin²θ. Try again or ask the AI Tutor for a hint!',
        })
      }
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <PageHeader
        title="My Adaptive Learning Experience"
        description="Learn at your own pace with teacher-approved tracks, interactive worked demonstrations, and instant AI tutor explanations."
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
            <select
              value={selectedTopic}
              onChange={(e) => {
                setSelectedTopic(e.target.value)
                setShowSolution(false)
                setPracticeSubmitted(false)
                setPracticeAnswer('')
              }}
              className="h-8 rounded-lg border border-input bg-card px-2.5 text-xs font-semibold outline-none focus-visible:border-ring"
            >
              <option value="ER Model">ER Model — Entity, Attribute, Cardinality</option>
              <option value="Trigonometric Identities">Trigonometric Identities</option>
              <option value="Quadratic Functions">Quadratic Functions</option>
            </select>
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
                    setPracticeSubmitted(false)
                    setPracticeAnswer('')
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
                {isDBMS
                  ? selectedLevel === 'Remedial'
                    ? 'Foundations of ER Modeling: Nouns, Verbs, and Cardinality Intuition'
                    : selectedLevel === 'Standard'
                      ? 'Entity-Relationship Conceptual Modeling & Relational Table Conversion'
                      : 'Advanced Database Modeling: EER Specialization & Normalization'
                  : selectedLevel === 'Remedial'
                    ? 'Foundations of Pythagorean Identities — Step-by-Step'
                    : selectedLevel === 'Standard'
                      ? 'Trigonometric Identities & Algebraic Proofs'
                      : 'Advanced Trigonometric Transformations & Wave Harmonics'}
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-6 pt-6 text-sm leading-relaxed">
              {/* Section 1: Conceptual Foundation */}
              <div>
                <h3 className="font-display text-base font-bold text-foreground">
                  1. Core Conceptual Strategy
                </h3>
                <div className="mt-2 space-y-2 text-muted-foreground">
                  <p>{activeTrack?.summary || 'Loading lesson track…'}</p>
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
                    {showSolution ? 'Hide Demonstration' : 'Reveal Step-by-Step Model'}
                  </Button>
                </div>

                <p className="text-muted-foreground">
                  <strong>Worked Example:</strong> {activeTrack?.example}
                </p>

                {showSolution && (
                  <div className="space-y-2 rounded-lg bg-primary/5 p-4 text-xs animate-in fade-in border border-primary/15">
                    <p className="font-semibold text-primary">Pedagogical Step-by-Step Breakdown:</p>
                    {isDBMS ? (
                      <div className="space-y-1.5 text-muted-foreground">
                        <p>1. Identify primary keys for <code>Student(StudentID)</code> and <code>Course(CourseID)</code>.</p>
                        <p>2. Notice that one student has many courses, and one course has many students (M:N).</p>
                        <p>3. Create associative table <code>Enrollment</code> with composite primary key <code>(StudentID, CourseID)</code>.</p>
                        <p>4. Relational integrity is preserved with zero data duplication!</p>
                      </div>
                    ) : (
                      <div className="space-y-1.5 text-muted-foreground">
                        <p>1. Start with fundamental Pythagorean identity: <code>sin²θ + cos²θ = 1</code>.</p>
                        <p>2. Rearrange terms: <code>1 − cos²θ = sin²θ</code>.</p>
                        <p>3. Substitute into the fraction to cancel common factors.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Section 3: Interactive Practice Check */}
              <div className="rounded-xl border border-border bg-muted/20 p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <Zap className="size-4 text-primary" />
                  <h3 className="font-display text-base font-bold text-foreground">
                    3. Quick Check for Understanding
                  </h3>
                </div>
                <p className="text-muted-foreground">
                  {isDBMS
                    ? 'How should an M:N relationship between Patient and Doctor be represented in a relational database?'
                    : 'If cos θ = 3/5 and θ is in the first quadrant, what is sin θ?'}
                </p>

                <div className="grid gap-2 sm:grid-cols-2">
                  {(isDBMS
                    ? [
                        { label: 'A', text: 'Store DoctorID in Patient table' },
                        { label: 'B', text: 'Store PatientID in Doctor table' },
                        { label: 'C', text: 'Create a Treatment Junction Table with (DoctorID, PatientID)' },
                        { label: 'D', text: 'Merge Patient and Doctor into one table' },
                      ]
                    : [
                        { label: 'A', text: '3/4' },
                        { label: 'B', text: '4/5' },
                        { label: 'C', text: '5/3' },
                        { label: 'D', text: '1/5' },
                      ]
                  ).map((opt) => (
                    <button
                      key={opt.label}
                      onClick={() => setPracticeAnswer(opt.label)}
                      className={`flex items-center gap-3 rounded-lg border p-3 text-xs text-left transition-colors ${
                        practiceAnswer === opt.label
                          ? 'border-primary bg-primary/10 font-bold text-primary'
                          : 'border-border bg-card text-foreground hover:bg-muted/40'
                      }`}
                    >
                      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted font-bold text-[11px]">
                        {opt.label}
                      </span>
                      <span>{opt.text}</span>
                    </button>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-2">
                  <Button
                    size="sm"
                    onClick={handleCheckAnswer}
                    disabled={!practiceAnswer}
                    className="gap-1.5 shadow-sm text-xs"
                  >
                    <Check className="size-3.5" />
                    Check Answer
                  </Button>

                  {practiceSubmitted && (
                    <span className="text-xs font-medium text-success flex items-center gap-1">
                      <CheckCircle2 className="size-3.5" />
                      Correct! Great understanding of the core concept.
                    </span>
                  )}
                </div>
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
