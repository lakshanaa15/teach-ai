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
  Zap,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LevelBadge } from '@/components/shared/badges'
import { AILoading } from '@/components/shared/states'
import { useAppSession } from '@/lib/session-context'
import type { LearningLevel, QuizQuestion } from '@/lib/types'
import { useToast } from '@/components/shared/toast'

export default function QuizzesPage() {
  const { toast } = useToast()
  const { selectedTopic, setSelectedTopic, getQuizForTopic } = useAppSession()

  // Form State
  const [topic, setTopic] = React.useState(selectedTopic)
  const [difficulty, setDifficulty] = React.useState<LearningLevel>('Standard')
  const [questionCount, setQuestionCount] = React.useState(4)
  const [questionType, setQuestionType] = React.useState<QuizQuestion['type']>('MCQ')

  const [isLoading, setIsLoading] = React.useState(false)
  const [questions, setQuestions] = React.useState<QuizQuestion[]>([])
  const [editingQuestionId, setEditingQuestionId] = React.useState<string | null>(null)
  const [editFormData, setEditFormData] = React.useState<QuizQuestion | null>(null)

  // Sync topic with session
  React.useEffect(() => {
    setTopic(selectedTopic)
    handleGenerate(selectedTopic)
  }, [selectedTopic])

  const handleGenerate = async (topicToGenerate = topic) => {
    setIsLoading(true)
    try {
      const generated = await getQuizForTopic(topicToGenerate, questionCount)
      setQuestions(generated)
    } finally {
      setIsLoading(false)
    }
  }

  const handleStartEdit = (q: QuizQuestion) => {
    setEditingQuestionId(q.id)
    setEditFormData({ ...q })
  }

  const handleSaveQuestionEdit = () => {
    if (!editFormData) return
    setQuestions((prev) =>
      prev.map((q) => (q.id === editFormData.id ? editFormData : q)),
    )
    setEditingQuestionId(null)
    setEditFormData(null)
    toast({ title: 'Question updated' })
  }

  const handleDeleteQuestion = (id: string) => {
    setQuestions((prev) => prev.filter((q) => q.id !== id))
    toast({ title: 'Question removed' })
  }

  const handleRegenerateSingle = async (index: number) => {
    const single = await getQuizForTopic(topic, 1)
    setQuestions((prev) => {
      const next = [...prev]
      next[index] = { ...single[0], id: `regen-${Date.now()}` }
      return next
    })
    toast({ title: 'Question regenerated' })
  }

  const handleAddQuestion = () => {
    const newQ: QuizQuestion = {
      id: `custom-${Date.now()}`,
      type: questionType,
      question: 'New custom concept question…',
      options:
        questionType === 'MCQ'
          ? ['Option A', 'Option B', 'Option C', 'Option D']
          : questionType === 'True/False'
            ? ['True', 'False']
            : undefined,
      answer: questionType === 'True/False' ? 'True' : 'Correct Answer',
      explanation: 'Explanation of why this answer is correct.',
      concept: 'Custom Concept',
    }
    setQuestions((prev) => [...prev, newQ])
    handleStartEdit(newQ)
  }

  const handleExport = (format: string) => {
    toast({
      title: `Quiz exported as ${format}`,
      description: `${questions.length} questions prepared for distribution.`,
    })
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <PageHeader
        title="Formative Quiz Generator & Rubrics"
        description="Generate concept-mapped formative quizzes. Tailor difficulty, question formats, and learning tracks with editable pedagogical rubrics."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport('PDF')}
              className="gap-1.5 text-xs"
            >
              <FileDown className="size-4" />
              Export PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport('LMS JSON')}
              className="gap-1.5 text-xs"
            >
              <Download className="size-4" />
              Export JSON
            </Button>
            <Button
              size="sm"
              onClick={() =>
                toast({
                  title: 'Quiz saved & published',
                  description: `Published "${topic} Check" to Grade 10 students.`,
                })
              }
              className="gap-1.5 shadow-sm"
            >
              <Save className="size-4" />
              Save & Assign
            </Button>
          </div>
        }
      />

      {/* Generator Settings Form */}
      <Card className="border-border/80 bg-card/60 p-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {/* Topic */}
          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Topic
            </label>
            <select
              value={topic}
              onChange={(e) => {
                setTopic(e.target.value)
                setSelectedTopic(e.target.value)
              }}
              className="h-9 w-full rounded-lg border border-input bg-card px-3 text-sm font-semibold outline-none focus-visible:border-ring focus-visible:ring-2"
            >
              <option value="ER Model">ER Model — Entity, Attribute, Cardinality</option>
              <option value="Trigonometric Identities">Trigonometric Identities</option>
              <option value="Intro to Calculus">Intro to Calculus</option>
              <option value="Quadratic Functions">Quadratic Functions</option>
            </select>
          </div>

          {/* Difficulty Level */}
          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Difficulty Tier
            </label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as LearningLevel)}
              className="h-9 w-full rounded-lg border border-input bg-card px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2"
            >
              <option value="Remedial">Remedial (Scaffolded)</option>
              <option value="Standard">Standard (Grade Level)</option>
              <option value="Advanced">Advanced (Challenge)</option>
            </select>
          </div>

          {/* Question Type */}
          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Question Type
            </label>
            <select
              value={questionType}
              onChange={(e) => setQuestionType(e.target.value as QuizQuestion['type'])}
              className="h-9 w-full rounded-lg border border-input bg-card px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2"
            >
              <option value="MCQ">Multiple Choice (MCQ)</option>
              <option value="True/False">True / False</option>
              <option value="Short Answer">Short Answer</option>
            </select>
          </div>

          {/* Count */}
          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Questions
            </label>
            <select
              value={questionCount}
              onChange={(e) => setQuestionCount(Number(e.target.value))}
              className="h-9 w-full rounded-lg border border-input bg-card px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2"
            >
              <option value={3}>3 Questions</option>
              <option value={4}>4 Questions</option>
              <option value={5}>5 Questions</option>
            </select>
          </div>

          {/* Trigger Button */}
          <div className="space-y-1 flex flex-col justify-end">
            <Button
              onClick={() => handleGenerate(topic)}
              disabled={isLoading}
              className="h-9 gap-1.5 shadow-sm"
            >
              <Sparkles className={`size-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              Generate Quiz
            </Button>
          </div>
        </div>
      </Card>

      {/* Generated Questions Area */}
      {isLoading ? (
        <AILoading
          label={`Generating ${questionCount} ${difficulty} questions for ${topic}…`}
          steps={[
            'Extracting core conceptual learning objectives…',
            'Constructing plausible distractor options mapped to common misconceptions…',
            'Drafting step-by-step explanatory feedback for student review…',
          ]}
        />
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="font-display text-lg font-bold">
                Generated Assessment ({questions.length} questions)
              </h2>
              <LevelBadge level={difficulty} />
              <Badge variant="outline" className="text-xs font-mono">
                {topic}
              </Badge>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleAddQuestion}
              className="gap-1.5 text-xs"
            >
              <Plus className="size-3.5" />
              Add Question
            </Button>
          </div>

          {/* Questions List */}
          <div className="space-y-4">
            {questions.map((q, index) => {
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
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => handleRegenerateSingle(index)}
                        title="Regenerate this question"
                        className="gap-1 text-xs text-muted-foreground hover:text-foreground"
                      >
                        <RefreshCw className="size-3" />
                        Regen
                      </Button>
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => (isEditing ? handleSaveQuestionEdit() : handleStartEdit(q))}
                        className="gap-1 text-xs text-muted-foreground hover:text-foreground"
                      >
                        <Edit3 className="size-3" />
                        {isEditing ? 'Save' : 'Edit'}
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

                        {editFormData.options && (
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
                          <Button size="xs" onClick={handleSaveQuestionEdit}>
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

                        {/* Short Answer / Answer display */}
                        {(!q.options || q.options.length === 0) && (
                          <div className="rounded-lg bg-muted/40 p-2.5 text-xs text-foreground">
                            <span className="font-semibold text-muted-foreground">Answer: </span>
                            <span className="font-mono font-bold text-success">{q.answer}</span>
                          </div>
                        )}

                        {/* Explanation */}
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

          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Link href={`/student/quizzes?topic=${encodeURIComponent(topic)}`}>
              <Button size="sm" className="gap-2 shadow-sm">
                Preview Student Quiz Experience
                <ArrowRight className="size-4" />
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
