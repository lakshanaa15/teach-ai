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
  Copy,
  Download,
  Edit3,
  Eye,
  FileCheck2,
  FileDown,
  FileText,
  FolderOpen,
  History,
  Layers,
  Lightbulb,
  ListOrdered,
  Plus,
  Printer,
  RefreshCw,
  Save,
  Send,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
  Upload,
  Wand2,
  X,
  XCircle,
  Zap,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AILoading } from '@/components/shared/states'
import { useToast } from '@/components/shared/toast'
import { exportLessonPlanPDF, exportQuizPDF } from '@/lib/export-pdf'
import type { GeneratedLessonPlanContent } from '@/lib/gemini'
import type { LessonPlanQualityAnalysis } from '@/lib/types'
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

interface SavedLessonPlan {
  id: string
  title: string
  subject: string
  grade: string
  topic: string
  learningObjective: string
  duration: string
  curriculum: string
  source?: string | null
  status: 'Draft' | 'Approved' | 'Pending_Review'
  content: GeneratedLessonPlanContent
  createdAt: string
  class?: { id: string; name: string; classCode: string } | null
}

interface ClassTopic {
  id: string
  title: string
  order: number
  isActive: boolean
}

interface TeacherClass {
  id: string
  name: string
  classCode: string
  subject?: string
  academicYear?: string
  department?: string
  section?: string
  topics?: ClassTopic[]
}

export default function LessonPlansPage() {
  const { toast } = useToast()

  // 9 Teacher Inputs
  const [subject, setSubject] = React.useState('Database Management Systems')
  const [grade, setGrade] = React.useState('III Year')
  const [topic, setTopic] = React.useState('Normalization')
  const [learningObjective, setLearningObjective] = React.useState(
    'Understand 1NF, 2NF, 3NF, and BCNF functional dependencies and construct normalized relational schemas.',
  )
  const [duration, setDuration] = React.useState('45 mins')
  const [noOfQuestions, setNoOfQuestions] = React.useState(4)
  const [optionalSource, setOptionalSource] = React.useState('')
  const [curriculum, setCurriculum] = React.useState('Autonomous / Computer Science')
  const [selectedClassId, setSelectedClassId] = React.useState('')

  // State
  const [classes, setClasses] = React.useState<TeacherClass[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)

  // Add Topic Inline State
  const [showAddTopicInline, setShowAddTopicInline] = React.useState(false)
  const [newTopicInline, setNewTopicInline] = React.useState('')
  const [isAddingTopicInline, setIsAddingTopicInline] = React.useState(false)

  // Active generated/loaded pair
  const [activePlan, setActivePlan] = React.useState<SavedLessonPlan | null>(null)
  const [activeQuiz, setActiveQuiz] = React.useState<SavedQuiz | null>(null)

  // Lesson plan full interactive edit state
  const [isEditingPlan, setIsEditingPlan] = React.useState(false)
  const [editedPlanContent, setEditedPlanContent] = React.useState<GeneratedLessonPlanContent | null>(null)
  const [editedPlanTitle, setEditedPlanTitle] = React.useState('')
  const [editedPlanTopic, setEditedPlanTopic] = React.useState('')
  const [editedPlanObjective, setEditedPlanObjective] = React.useState('')

  // Attached PDF Learning Materials State
  const [attachedMaterials, setAttachedMaterials] = React.useState<any[]>([])
  const [isUploadingPdf, setIsUploadingPdf] = React.useState(false)
  const [pdfUploadProgress, setPdfUploadProgress] = React.useState(0)
  const pdfInputRef = React.useRef<HTMLInputElement | null>(null)

  // Quiz inline edit state
  const [editingQuestionId, setEditingQuestionId] = React.useState<string | null>(null)
  const [editQuestionData, setEditQuestionData] = React.useState<SavedQuestion | null>(null)
  const [editedQuizTitle, setEditedQuizTitle] = React.useState('')

  // Quality analysis state
  const [qualityAnalysis, setQualityAnalysis] = React.useState<LessonPlanQualityAnalysis | null>(null)
  const [isAnalyzingQuality, setIsAnalyzingQuality] = React.useState(false)
  const [planModifiedSinceAnalysis, setPlanModifiedSinceAnalysis] = React.useState(false)

  // Saved History from PostgreSQL
  const [savedPlansList, setSavedPlansList] = React.useState<SavedLessonPlan[]>([])

  const handleAnalyzeQuality = async () => {
    if (!activePlan && !editedPlanContent) {
      toast({
        title: 'No Lesson Plan Available',
        description: 'Please generate or load a lesson plan first before analyzing its quality.',
      })
      return
    }

    setIsAnalyzingQuality(true)
    try {
      const contentToAnalyze = editedPlanContent || activePlan?.content
      const res = await fetch('/api/lesson-plans/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonPlanId: activePlan?.id,
          content: contentToAnalyze,
          topic: activePlan?.topic || topic,
          subject: activePlan?.subject || subject,
          grade: activePlan?.grade || grade,
          learningObjective: activePlan?.learningObjective || learningObjective,
          duration: activePlan?.duration || duration,
          curriculum: activePlan?.curriculum || curriculum,
          quizQuestions: activeQuiz?.questions,
        }),
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        toast({
          title: 'Quality Analysis Failed',
          description: data.error || 'Gemini API failed to evaluate lesson plan quality.',
        })
        return
      }

      setQualityAnalysis(data.analysis)
      setPlanModifiedSinceAnalysis(false)
      toast({
        title: 'Pedagogical Analysis Complete ✨',
        description: `Gemini evaluated 8 dimensions: Overall Quality Score ${data.analysis.overallScore}/100 (${data.analysis.rating}).`,
      })
    } catch (err) {
      toast({
        title: 'Analysis Error',
        description: err instanceof Error ? err.message : 'Could not analyze lesson plan quality.',
      })
    } finally {
      setIsAnalyzingQuality(false)
    }
  }

  // Load teacher classes and recent lesson plans on mount
  React.useEffect(() => {
    fetchTeacherClasses()
    fetchSavedLessonPlans()
  }, [])

  const fetchTeacherClasses = async () => {
    try {
      const res = await fetch('/api/classes')
      const data = await res.json()
      if (res.ok && data.classes && data.classes.length > 0) {
        setClasses(data.classes)

        // Check if classId in query string
        const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
        const classIdFromUrl = urlParams?.get('classId')
        const targetClass = classIdFromUrl
          ? data.classes.find((c: TeacherClass) => c.id === classIdFromUrl) || data.classes[0]
          : data.classes[0]

        if (targetClass) {
          setSelectedClassId(targetClass.id)
          if (targetClass.subject) setSubject(targetClass.subject)
          if (targetClass.academicYear) setGrade(targetClass.academicYear)
          if (targetClass.topics && targetClass.topics.length > 0) {
            setTopic(targetClass.topics[0].title)
          }
        }
      }
    } catch {
      // ignore
    }
  }

  const handleSelectClass = (classId: string) => {
    setSelectedClassId(classId)
    const cls = classes.find((c) => c.id === classId)
    if (cls) {
      if (cls.subject) setSubject(cls.subject)
      if (cls.academicYear) setGrade(cls.academicYear)
      if (cls.topics && cls.topics.length > 0) {
        setTopic(cls.topics[0].title)
      }
    }
  }

  const handleAddNewTopicInline = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedClassId || !newTopicInline.trim()) return
    setIsAddingTopicInline(true)
    try {
      const res = await fetch(`/api/classes/${selectedClassId}/topics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTopicInline.trim() }),
      })
      const data = await res.json()
      if (res.ok && data.success && data.topic) {
        setClasses((prev) =>
          prev.map((c) =>
            c.id === selectedClassId
              ? { ...c, topics: [...(c.topics || []), data.topic] }
              : c,
          ),
        )
        setTopic(data.topic.title)
        setNewTopicInline('')
        setShowAddTopicInline(false)
        toast({
          title: 'Topic Added to Class Syllabus! 📚',
          description: `"${data.topic.title}" is now selected for this lesson plan.`,
        })
      }
    } catch {
      toast({ title: 'Error', description: 'Could not add topic to class syllabus.' })
    } finally {
      setIsAddingTopicInline(false)
    }
  }

  const handleUploadPdf = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      toast({ title: 'Invalid File Type', description: 'Please select a PDF document (.pdf).' })
      return
    }

    if (file.size > 50 * 1024 * 1024) {
      toast({ title: 'File Too Large', description: 'Maximum PDF file size is 50MB.' })
      return
    }

    setIsUploadingPdf(true)
    setPdfUploadProgress(35)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('name', file.name)
    formData.append('subject', activePlan?.subject || subject)
    formData.append('topic', activePlan?.topic || topic)
    if (selectedClassId) formData.append('classId', selectedClassId)
    if (activePlan?.id) formData.append('lessonPlanId', activePlan.id)

    try {
      setPdfUploadProgress(70)
      const res = await fetch('/api/materials', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      setPdfUploadProgress(100)

      if (res.ok && data.success && data.material) {
        setAttachedMaterials((prev) => [data.material, ...prev])
        toast({
          title: 'PDF Uploaded Successfully! 📄',
          description: `Attached "${file.name}" to this lesson plan and persisted to storage.`,
        })
      } else {
        toast({
          title: 'Upload Failed',
          description: data.error || 'Failed to upload PDF.',
        })
      }
    } catch {
      toast({ title: 'Upload Error', description: 'Network error uploading PDF.' })
    } finally {
      setIsUploadingPdf(false)
      setPdfUploadProgress(0)
      if (pdfInputRef.current) pdfInputRef.current.value = ''
    }
  }

  const fetchSavedLessonPlans = async () => {
    try {
      const res = await fetch('/api/lesson-plans')
      const data = await res.json()
      if (res.ok && data.lessonPlans && data.lessonPlans.length > 0) {
        setSavedPlansList(data.lessonPlans)
        // If there's no active plan in memory, auto-populate with the latest from PostgreSQL
        setActivePlan((current) => {
          if (!current) {
            const latest = data.lessonPlans[0]
            setEditedPlanContent(JSON.parse(JSON.stringify(latest.content)))
            setEditedPlanTitle(latest.title)
            return latest
          }
          return current
        })
      }
    } catch {
      // ignore
    }
  }

  const handleSelectSavedPlan = (plan: SavedLessonPlan) => {
    setActivePlan(plan)
    setEditedPlanContent(JSON.parse(JSON.stringify(plan.content)))
    setEditedPlanTitle(plan.title)
    setIsEditingPlan(false)
    window.scrollTo({ top: 350, behavior: 'smooth' })
  }

  const handleGenerate = async () => {
    const countNum = Number(noOfQuestions)
    if (!countNum || countNum < 1) {
      toast({
        title: 'Validation Error',
        description: 'No. of Questions must be a positive integer.',
      })
      return
    }

    if (
      !subject.trim() ||
      !grade.trim() ||
      !topic.trim() ||
      !learningObjective.trim() ||
      !duration.trim() ||
      !curriculum.trim()
    ) {
      toast({
        title: 'Missing Required Fields',
        description: 'Please complete all required fields (Subject, Grade, Topic, Objective, Duration, Board).',
      })
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch('/api/lesson-plans/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: subject.trim(),
          grade: grade.trim(),
          topic: topic.trim(),
          learningObjective: learningObjective.trim(),
          duration: duration.trim(),
          noOfQuestions: countNum,
          curriculum: curriculum.trim(),
          optionalSource: optionalSource.trim() || undefined,
          classId: selectedClassId || undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        toast({
          title: 'Generation Failed',
          description: data.error || 'Gemini API failed to generate lesson plan and quiz.',
        })
        return
      }

      const plan: SavedLessonPlan = data.lessonPlan
      const quiz: SavedQuiz = data.quiz

      setActivePlan(plan)
      setEditedPlanContent(JSON.parse(JSON.stringify(plan.content)))
      setEditedPlanTitle(plan.title)
      setIsEditingPlan(false)

      setActiveQuiz(quiz)
      setEditedQuizTitle(quiz.title)
      setEditingQuestionId(null)

      setSavedPlansList((prev) => [plan, ...prev.filter((p) => p.id !== plan.id)])

      toast({
        title: `Lesson Plan & Quiz Generated! 🎉`,
        description: `Status is DRAFT. You can now click [ Edit ] to customize the generated content.`,
      })
    } catch {
      toast({
        title: 'Connection Error',
        description: 'Could not connect to the Lesson Plan generation service.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleStartEditPlan = () => {
    if (!activePlan) return
    setEditedPlanContent(JSON.parse(JSON.stringify(activePlan.content)))
    setEditedPlanTitle(activePlan.title)
    setIsEditingPlan(true)
    toast({
      title: 'Edit Mode Activated',
      description: 'You can now modify any section of the lesson plan below.',
    })
  }

  const handleCancelEditPlan = () => {
    if (!activePlan) return
    setEditedPlanContent(JSON.parse(JSON.stringify(activePlan.content)))
    setEditedPlanTitle(activePlan.title)
    setIsEditingPlan(false)
    toast({
      title: 'Edits Discarded',
      description: 'Restored the last saved version from database.',
    })
  }

  // Save changes to PostgreSQL (status remains DRAFT)
  const handleSaveChanges = async () => {
    if (!activePlan) return
    setIsSaving(true)

    try {
      // 1. Update Lesson Plan
      const contentToSave = isEditingPlan && editedPlanContent ? editedPlanContent : activePlan.content
      const titleToSave = (isEditingPlan ? editedPlanTitle : activePlan.title).trim() || activePlan.title

      // Keep title synchronized inside content object as well
      if (contentToSave) {
        contentToSave.lessonTitle = titleToSave
      }

      const lpRes = await fetch(`/api/lesson-plans/${activePlan.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: titleToSave,
          content: contentToSave,
          classId: selectedClassId || activePlan.class?.id || undefined,
        }),
      })
      const lpData = await lpRes.json()

      if (!lpRes.ok || !lpData.success) {
        toast({ title: 'Save Failed', description: lpData.error || 'Failed to save lesson plan.' })
        setIsSaving(false)
        return
      }

      setActivePlan(lpData.lessonPlan)
      setEditedPlanContent(JSON.parse(JSON.stringify(lpData.lessonPlan.content)))
      setEditedPlanTitle(lpData.lessonPlan.title)
      setIsEditingPlan(false)
      setSavedPlansList((prev) =>
        prev.map((p) => (p.id === lpData.lessonPlan.id ? lpData.lessonPlan : p)),
      )

      // 2. Update Quiz if present
      if (activeQuiz) {
        const quizRes = await fetch(`/api/quizzes/${activeQuiz.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: editedQuizTitle.trim() || activeQuiz.title,
            questions: activeQuiz.questions,
            classId: selectedClassId || activeQuiz.class?.id || undefined,
          }),
        })
        const quizData = await quizRes.json()
        if (quizRes.ok && quizData.success) {
          setActiveQuiz(quizData.quiz)
          setEditingQuestionId(null)
        }
      }

      toast({
        title: 'Lesson plan saved successfully.',
        description: 'Your changes are saved to PostgreSQL (Status: DRAFT).',
      })
    } catch {
      toast({ title: 'Error', description: 'Failed to save changes.' })
    } finally {
      setIsSaving(false)
    }
  }

  // Approve & Publish action (uses current saved/edited version)
  const handleApproveAndPublish = async () => {
    if (!activePlan) return
    setIsSaving(true)

    try {
      // 1. If user is in edit mode, save edits first
      if (isEditingPlan && editedPlanContent) {
        const titleToSave = editedPlanTitle.trim() || activePlan.title
        editedPlanContent.lessonTitle = titleToSave
        await fetch(`/api/lesson-plans/${activePlan.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: titleToSave,
            content: editedPlanContent,
            classId: selectedClassId || undefined,
          }),
        })
      }

      // Approve lesson plan
      const lpApproveRes = await fetch(`/api/lesson-plans/${activePlan.id}/approve`, {
        method: 'POST',
      })
      const lpData = await lpApproveRes.json()
      if (lpApproveRes.ok && lpData.success) {
        setActivePlan(lpData.lessonPlan)
        setEditedPlanContent(JSON.parse(JSON.stringify(lpData.lessonPlan.content)))
        setIsEditingPlan(false)
        setSavedPlansList((prev) =>
          prev.map((p) => (p.id === lpData.lessonPlan.id ? lpData.lessonPlan : p)),
        )
      }

      // 2. Save and Publish Quiz to Selected Class
      if (activeQuiz) {
        await fetch(`/api/quizzes/${activeQuiz.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: editedQuizTitle.trim() || activeQuiz.title,
            questions: activeQuiz.questions,
            classId: selectedClassId || undefined,
          }),
        })

        const quizPubRes = await fetch(`/api/quizzes/${activeQuiz.id}/publish`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            classId: selectedClassId || undefined,
          }),
        })
        const quizData = await quizPubRes.json()
        if (quizPubRes.ok && quizData.success) {
          setActiveQuiz(quizData.quiz)
        }
      }

      const targetClassName = classes.find((c) => c.id === selectedClassId)?.name || 'selected class'

      toast({
        title: 'Approved & Published to Students! 🚀',
        description: `Lesson Plan is APPROVED and Quiz is now LIVE for students in ${targetClassName}.`,
      })
    } catch {
      toast({ title: 'Error', description: 'Failed to approve and publish.' })
    } finally {
      setIsSaving(false)
    }
  }

  // Quiz inline question edits
  const handleStartEditQuestion = (q: SavedQuestion) => {
    setEditingQuestionId(q.id)
    setEditQuestionData({ ...q })
  }

  const handleSaveInlineQuestion = () => {
    if (!editQuestionData || !activeQuiz) return
    setActiveQuiz((prev) => {
      if (!prev) return null
      return {
        ...prev,
        questions: prev.questions.map((q) => (q.id === editQuestionData.id ? editQuestionData : q)),
      }
    })
    setEditingQuestionId(null)
    setEditQuestionData(null)
    toast({ title: 'Question updated in memory' })
  }

  const handleAddQuizQuestion = () => {
    if (!activeQuiz) return
    const newQ: SavedQuestion = {
      id: `q-custom-${Date.now()}`,
      type: 'MCQ',
      question: 'New concept assessment question prompt…',
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      answer: 'Option A',
      explanation: 'Pedagogical explanation justifying the correct answer.',
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
    toast({
      title: 'New Question Added! ✍️',
      description: 'Scroll down to the quiz section to customize this question.',
    })
  }

  const handleDeleteQuizQuestion = (id: string) => {
    if (!activeQuiz) return
    setActiveQuiz((prev) => {
      if (!prev) return null
      return {
        ...prev,
        questions: prev.questions.filter((q) => q.id !== id),
      }
    })
    if (editingQuestionId === id) {
      setEditingQuestionId(null)
      setEditQuestionData(null)
    }
    toast({ title: 'Question removed from quiz' })
  }

  // PDF Export Handlers
  const handleExportLessonPlanPDF = () => {
    if (!activePlan || !activePlan.content) return
    exportLessonPlanPDF({
      title: isEditingPlan ? editedPlanTitle : activePlan.title,
      subject: activePlan.subject,
      grade: activePlan.grade,
      topic: activePlan.topic,
      learningObjective: activePlan.learningObjective,
      duration: activePlan.duration,
      curriculum: activePlan.curriculum,
      source: activePlan.source,
      status: activePlan.status,
      content: isEditingPlan && editedPlanContent ? editedPlanContent : activePlan.content,
    })
    toast({ title: 'Exporting Lesson Plan PDF…', description: 'Opening printable lesson plan window.' })
  }

  const handleExportStudentQuizPDF = () => {
    if (!activeQuiz) return
    exportQuizPDF(activeQuiz, 'student')
    toast({ title: 'Exporting Student Quiz PDF…', description: 'Opening student paper (answers hidden).' })
  }

  const handleExportAnswerKeyPDF = () => {
    if (!activeQuiz) return
    exportQuizPDF(activeQuiz, 'answer_key')
    toast({ title: 'Exporting Answer Key PDF…', description: 'Opening master answer key.' })
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <PageHeader
        title="AI Lesson Plan & Formative Quiz Generator"
        description="Generate comprehensive pedagogical lesson plans and aligned formative quizzes simultaneously using Google Gemini AI. Review, customize, save drafts, export PDF documents, and publish to enrolled classes."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {activePlan && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportLessonPlanPDF}
                  className="gap-1.5 text-xs shadow-sm"
                >
                  <FileDown className="size-4" />
                  Lesson Plan PDF
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAnalyzeQuality}
                  disabled={isAnalyzingQuality || isLoading}
                  className="gap-1.5 text-xs shadow-sm text-primary border-primary/40 hover:bg-primary/5 font-semibold"
                >
                  <Sparkles className={`size-4 ${isAnalyzingQuality ? 'animate-spin text-primary' : ''}`} />
                  {isAnalyzingQuality
                    ? 'Evaluating with Gemini...'
                    : qualityAnalysis
                      ? 'Re-analyze Quality with AI'
                      : 'Analyze Quality with AI'}
                </Button>
                {activeQuiz && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleExportStudentQuizPDF}
                      className="gap-1.5 text-xs shadow-sm"
                    >
                      <FileDown className="size-4" />
                      Student Quiz PDF
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleExportAnswerKeyPDF}
                      className="gap-1.5 text-xs shadow-sm"
                    >
                      <FileCheck2 className="size-4 text-primary" />
                      Answer Key PDF
                    </Button>
                  </>
                )}
                {activePlan.status !== 'Approved' ? (
                  <Button
                    size="sm"
                    onClick={handleApproveAndPublish}
                    disabled={isSaving || isLoading}
                    className="gap-1.5 shadow-sm bg-success hover:bg-success/90"
                  >
                    <CheckCircle2 className="size-4" />
                    Approve & Publish
                  </Button>
                ) : (
                  <Badge variant="success" className="px-3 py-1 text-xs gap-1">
                    <Check className="size-3.5" /> Approved & Published
                  </Badge>
                )}
              </>
            )}
          </div>
        }
      />

      {/* Teacher Input Form Card (9 Inputs) */}
      <Card className="border-primary/30 bg-card shadow-sm">
        <CardHeader className="border-b border-border pb-3 bg-muted/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              <CardTitle className="text-sm font-bold">Curriculum & Assessment Inputs</CardTitle>
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

            {/* 2. Subject (Auto-populated from Class) */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span>Subject</span>
                <span className="text-[10px] text-muted-foreground font-normal">Auto-set from class</span>
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Database Management Systems"
                className="h-9 w-full rounded-lg border border-input bg-muted/40 px-3 text-xs outline-none focus-visible:border-ring focus-visible:ring-2 font-semibold text-foreground"
              />
            </div>

            {/* 3. Academic Year / Grade */}
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
                placeholder="e.g. 45 mins"
                className="h-9 w-full rounded-lg border border-input bg-background px-3 text-xs outline-none focus-visible:border-ring focus-visible:ring-2 font-medium"
              />
            </div>
          </div>

          {/* Row 2: Topic Selection with + Add New Topic, Curriculum, Question Count */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* 5. Topic (from Syllabus) */}
            <div className="space-y-1.5 lg:col-span-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground">
                  Select Topic (from Syllabus) <span className="text-destructive">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowAddTopicInline(!showAddTopicInline)}
                  className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1"
                >
                  <Plus className="size-3" />
                  {showAddTopicInline ? 'Select Existing Topic' : '+ Add New Topic'}
                </button>
              </div>

              {showAddTopicInline ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Enter new topic title (e.g. Normalization)..."
                    value={newTopicInline}
                    onChange={(e) => setNewTopicInline(e.target.value)}
                    className="h-9 flex-1 rounded-lg border border-input bg-background px-3 text-xs outline-none focus-visible:border-ring"
                  />
                  <Button
                    type="button"
                    size="sm"
                    disabled={isAddingTopicInline || !newTopicInline.trim()}
                    onClick={handleAddNewTopicInline}
                    className="gap-1 text-xs shrink-0"
                  >
                    <Plus className="size-3.5" />
                    Add to Syllabus
                  </Button>
                </div>
              ) : (
                (() => {
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
                      placeholder="e.g. Normalization (1NF, 2NF, 3NF, BCNF)"
                      className="h-9 w-full rounded-lg border border-input bg-background px-3 text-xs outline-none focus-visible:border-ring focus-visible:ring-2 font-medium"
                    />
                  )
                })()
              )}
            </div>

            {/* 6. No. of Questions */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Quiz Questions <span className="text-destructive">*</span>
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
              placeholder="e.g. Understand 1NF, 2NF, 3NF, and BCNF functional dependencies and construct normalized relational schemas."
              className="w-full resize-none rounded-lg border border-input bg-background p-2.5 text-xs outline-none focus-visible:border-ring focus-visible:ring-2"
            />
          </div>

          {/* Row 4: Curriculum & Optional Source */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Curriculum / Board</label>
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
                placeholder="e.g. Lecture slide excerpts, Chapter 3 notes..."
                className="h-9 w-full rounded-lg border border-input bg-background px-3 text-xs outline-none focus-visible:border-ring focus-visible:ring-2"
              />
            </div>
          </div>

          {/* ONE Primary Generate Button */}
          <div className="flex justify-end pt-2 border-t border-border">
            <Button
              onClick={handleGenerate}
              disabled={isLoading || !subject.trim() || !topic.trim() || !learningObjective.trim()}
              className="gap-2 shadow-sm text-xs font-semibold"
            >
              <Sparkles className={`size-4 ${isLoading ? 'animate-spin' : ''}`} />
              {isLoading ? 'Generating Lesson Plan & Quiz with Gemini…' : 'Generate Lesson Plan'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {isLoading && (
        <AILoading
          label={`Generating Lesson Plan & ${noOfQuestions}-Question Quiz for ${topic} with Gemini AI…`}
          steps={[
            'Synthesizing pedagogical lesson structure and Bloom’s taxonomy objectives…',
            'Generating 3-tier differentiated tasks (Remedial, Standard, Advanced)…',
            `Drafting ${noOfQuestions} aligned assessment questions with plausible distractors…`,
            'Saving drafts into Supabase PostgreSQL…',
          ]}
        />
      )}

      {/* Saved Lesson Plans Drawer/Bar */}
      {!isLoading && savedPlansList.length > 0 && (
        <Card className="border-border bg-card/60 shadow-none">
          <CardHeader className="py-2.5 px-4 border-b border-border bg-muted/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="size-3.5 text-muted-foreground" />
                <span className="text-xs font-bold text-foreground">Saved Lesson Plans ({savedPlansList.length})</span>
              </div>
              <span className="text-[11px] text-muted-foreground">Click any saved plan to view or edit</span>
            </div>
          </CardHeader>
          <CardContent className="p-2.5 flex gap-2 overflow-x-auto">
            {savedPlansList.map((p) => {
              const isSelected = activePlan?.id === p.id
              return (
                <button
                  key={p.id}
                  onClick={() => handleSelectSavedPlan(p)}
                  className={`flex shrink-0 items-center gap-2 rounded-lg border px-3 py-1.5 text-xs transition-all text-left ${
                    isSelected
                      ? 'border-primary bg-primary/10 text-primary font-bold shadow-xs'
                      : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground'
                  }`}
                >
                  <BookOpen className="size-3.5 shrink-0" />
                  <span className="max-w-[200px] truncate">{p.title}</span>
                  <Badge
                    variant={p.status === 'Approved' ? 'success' : 'warning'}
                    className="text-[9px] px-1 py-0 uppercase"
                  >
                    {p.status === 'Approved' ? 'Appr' : 'Draft'}
                  </Badge>
                </button>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* Display Generated/Loaded Lesson Plan & Quiz */}
      {!isLoading && activePlan && activePlan.content && (
        <div className="space-y-6 animate-in fade-in-50">
          {/* VISUAL WORKFLOW PIPELINE: DRAFT ➔ EDIT ➔ REVIEW ➔ APPROVED ➔ PUBLISHED */}
          <Card className="border-border bg-card p-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Publishing Lifecycle:
                </span>
                <Badge
                  variant={activePlan.status === 'Approved' ? 'success' : isEditingPlan ? 'default' : 'warning'}
                  className="text-[10px] uppercase font-bold"
                >
                  {activePlan.status === 'Approved' ? '✓ APPROVED & PUBLISHED' : isEditingPlan ? '✏️ IN EDIT' : '⚡ DRAFT REVIEW'}
                </Badge>
              </div>
              <p className="text-xs font-medium text-muted-foreground">
                {activePlan.status === 'Approved'
                  ? '✓ This lesson and quiz are published and live for enrolled students.'
                  : '⚠️ Review the lesson plan and quiz before approving.'}
              </p>
            </div>

            {/* Stepper Steps */}
            <div className="grid grid-cols-5 gap-2 text-center text-xs font-semibold">
              {[
                { step: '1', label: 'DRAFT', done: true, desc: 'AI Generated' },
                { step: '2', label: 'EDIT', done: isEditingPlan || activePlan.status === 'Approved', desc: 'Customized' },
                { step: '3', label: 'REVIEW', done: activePlan.status === 'Approved', desc: 'Verification' },
                { step: '4', label: 'APPROVED', done: activePlan.status === 'Approved', desc: 'Teacher Sign-Off' },
                { step: '5', label: 'PUBLISHED', done: activePlan.status === 'Approved', desc: 'Live in Class' },
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

          {/* Top Control Bar */}
          <Card className={`border-primary/40 p-4 transition-all ${isEditingPlan ? 'bg-primary/5 border-primary shadow-sm ring-1 ring-primary/30' : 'bg-muted/20'}`}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Badge
                  variant={activePlan.status === 'Approved' ? 'success' : 'warning'}
                  className="px-2.5 py-0.5 font-bold uppercase text-[11px]"
                >
                  {activePlan.status === 'Approved' ? '✓ APPROVED' : '⚡ DRAFT'}
                </Badge>
                <div>
                  <h2 className="text-base font-bold text-foreground">
                    {isEditingPlan ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-primary">Title:</span>
                        <input
                          type="text"
                          value={editedPlanTitle}
                          onChange={(e) => setEditedPlanTitle(e.target.value)}
                          placeholder="Lesson Plan Title"
                          className="h-8 w-full min-w-[280px] rounded border border-input bg-card px-2 font-bold text-sm outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                    ) : (
                      activePlan.title
                    )}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {activePlan.subject} · {activePlan.grade} · {activePlan.duration} · {activePlan.curriculum}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {isEditingPlan ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCancelEditPlan}
                      className="text-xs gap-1"
                    >
                      <X className="size-3.5" />
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveChanges}
                      disabled={isSaving}
                      className="gap-1.5 text-xs shadow-sm bg-primary hover:bg-primary/90"
                    >
                      <Save className="size-3.5" />
                      Save Changes
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      size="sm"
                      onClick={handleStartEditPlan}
                      className="gap-1.5 text-xs bg-amber-500 hover:bg-amber-600 text-white font-bold shadow-sm"
                    >
                      <Edit3 className="size-4" />
                      Edit Lesson Plan
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSaveChanges}
                      disabled={isSaving}
                      className="gap-1.5 text-xs"
                    >
                      <Save className="size-3.5" />
                      Save Changes
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleGenerate}
                      className="gap-1.5 text-xs"
                    >
                      <RefreshCw className="size-3.5" />
                      Regenerate
                    </Button>
                    {activePlan.status !== 'Approved' && (
                      <Button
                        size="sm"
                        onClick={handleApproveAndPublish}
                        disabled={isSaving}
                        className="gap-1.5 text-xs shadow-sm bg-success hover:bg-success/90 font-bold"
                      >
                        <CheckCircle2 className="size-3.5" />
                        Approve & Publish
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Editing Active Notification Banner */}
            {isEditingPlan && (
              <div className="mt-3 space-y-2.5 rounded-lg bg-primary/10 border border-primary/20 p-3 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-primary font-bold">
                    <Edit3 className="size-4 animate-pulse" />
                    <span>EDITING LESSON PLAN & TOPIC: Modify title, topic, objective, or content below.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="xs" variant="outline" onClick={handleCancelEditPlan}>
                      Cancel
                    </Button>
                    <Button
                      size="xs"
                      onClick={handleSaveChanges}
                      disabled={isSaving}
                      className="bg-primary text-primary-foreground font-semibold"
                    >
                      Save Changes
                    </Button>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 pt-1 border-t border-primary/20">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-foreground">Topic:</label>
                    <input
                      type="text"
                      value={editedPlanTopic}
                      onChange={(e) => setEditedPlanTopic(e.target.value)}
                      className="h-8 w-full rounded border border-input bg-card px-2 text-xs font-semibold"
                    />
                    {editedPlanTopic !== activePlan.topic && (
                      <div className="mt-1 flex items-center justify-between rounded bg-amber-500/10 p-1.5 text-[11px] text-amber-700 dark:text-amber-300">
                        <span>Topic changed from &quot;{activePlan.topic}&quot;.</span>
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => {
                            setTopic(editedPlanTopic)
                            handleGenerate()
                          }}
                          className="h-6 text-[10px] gap-1 border-amber-500/40"
                        >
                          <RefreshCw className="size-2.5" /> Regenerate for New Topic
                        </Button>
                      </div>
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-foreground">Learning Objective:</label>
                    <textarea
                      rows={2}
                      value={editedPlanObjective}
                      onChange={(e) => setEditedPlanObjective(e.target.value)}
                      className="w-full rounded border border-input bg-card p-1.5 text-xs resize-none"
                    />
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* AI PEDAGOGICAL QUALITY & DIAGNOSTIC REVIEW PANEL */}
          {qualityAnalysis && (
            <Card className="border-2 border-primary/30 bg-card shadow-md animate-in fade-in zoom-in-95">
              <CardHeader className="border-b border-border pb-4 bg-muted/20">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Sparkles className="size-4" />
                      </div>
                      <CardTitle className="text-base font-bold text-foreground">
                        AI Pedagogical Quality & Criterion Review
                      </CardTitle>
                      <Badge
                        variant={
                          qualityAnalysis.overallScore >= 85
                            ? 'success'
                            : qualityAnalysis.overallScore >= 70
                              ? 'default'
                              : 'warning'
                        }
                        className="text-xs"
                      >
                        {qualityAnalysis.rating}
                      </Badge>
                      {planModifiedSinceAnalysis && (
                        <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300 animate-pulse">
                          Plan edited — click Re-analyze
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{qualityAnalysis.summary}</p>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-xs uppercase font-semibold text-muted-foreground">Overall Quality</div>
                      <div className="text-2xl font-black text-primary font-mono tracking-tight">
                        {qualityAnalysis.overallScore}
                        <span className="text-xs text-muted-foreground font-normal"> / 100</span>
                      </div>
                    </div>
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={handleAnalyzeQuality}
                      disabled={isAnalyzingQuality}
                      className="gap-1 text-xs text-primary"
                    >
                      <RefreshCw className={`size-3 ${isAnalyzingQuality ? 'animate-spin' : ''}`} />
                      Re-analyze
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-6 pt-5 text-sm">
                {/* 1. 8-Criteria Diagnostic Grid */}
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                    Pedagogical Dimension Evaluation
                  </h4>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {Object.entries(qualityAnalysis.criteria).map(([key, crit]) => {
                      const labelMap: Record<string, string> = {
                        objectiveAlignment: 'Objective Alignment',
                        bloomsAlignment: "Bloom's Taxonomy",
                        contentQuality: 'Content Quality',
                        pedagogicalQuality: 'Pedagogical Quality',
                        differentiation: 'Differentiation',
                        assessmentQuality: 'Assessment Quality',
                        timeFeasibility: 'Time & Feasibility',
                        curriculumAlignment: 'Curriculum Alignment',
                      }
                      const label = labelMap[key] || key
                      const isHigh = crit.score >= 80
                      const isMed = crit.score >= 65
                      return (
                        <div
                          key={key}
                          className="flex flex-col justify-between rounded-xl border border-border bg-card p-3 shadow-2xs"
                        >
                          <div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold text-foreground">{label}</span>
                              <span
                                className={`text-xs font-mono font-bold ${
                                  isHigh ? 'text-success' : isMed ? 'text-primary' : 'text-destructive'
                                }`}
                              >
                                {crit.score}%
                              </span>
                            </div>
                            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                              <div
                                className={`h-full transition-all ${
                                  isHigh ? 'bg-success' : isMed ? 'bg-primary' : 'bg-destructive'
                                }`}
                                style={{ width: `${crit.score}%` }}
                              />
                            </div>
                            {crit.levelsDetected && crit.levelsDetected.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {crit.levelsDetected.map((lvl, idx) => (
                                  <Badge key={idx} variant="secondary" className="text-[9px] py-0 px-1 font-normal">
                                    {lvl}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                          <p className="mt-2 text-[11px] text-muted-foreground leading-snug line-clamp-3 hover:line-clamp-none transition-all">
                            {crit.explanation}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* 2. Strengths vs Areas to Improve */}
                <div className="grid gap-4 sm:grid-cols-2">
                  {/* Strengths */}
                  <div className="rounded-xl border border-success/30 bg-success/[0.02] p-4 space-y-2">
                    <div className="flex items-center gap-1.5 font-bold text-xs text-success uppercase tracking-wider">
                      <CheckCircle2 className="size-4 text-success" />
                      <span>Pedagogical Strengths</span>
                    </div>
                    <ul className="space-y-1.5 text-xs text-muted-foreground">
                      {qualityAnalysis.strengths.map((str, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-success font-bold">•</span>
                          <span>{str}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Areas to Improve / Missing Elements */}
                  <div className="rounded-xl border border-warning/30 bg-warning/[0.02] p-4 space-y-2">
                    <div className="flex items-center gap-1.5 font-bold text-xs text-warning-foreground uppercase tracking-wider">
                      <AlertCircle className="size-4 text-warning-foreground" />
                      <span>Areas for Improvement & Missing Elements</span>
                    </div>
                    <ul className="space-y-1.5 text-xs text-muted-foreground">
                      {qualityAnalysis.weaknesses.map((w, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-warning-foreground font-bold">•</span>
                          <span>{w}</span>
                        </li>
                      ))}
                      {qualityAnalysis.missingElements?.map((m, idx) => (
                        <li key={`m-${idx}`} className="flex items-start gap-2 text-rose-600 font-medium">
                          <span>⚠️ Missing:</span>
                          <span>{m}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* 3. Prioritized Action Plan */}
                {qualityAnalysis.priorityActions && qualityAnalysis.priorityActions.length > 0 && (
                  <div className="space-y-2.5 pt-2 border-t border-border">
                    <div className="flex items-center gap-2">
                      <Target className="size-4 text-primary" />
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Recommended Priority Action Plan
                      </h4>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {qualityAnalysis.priorityActions.map((pa, idx) => (
                        <div
                          key={idx}
                          className="rounded-lg border border-border bg-card p-3 text-xs space-y-1 shadow-2xs"
                        >
                          <div className="flex items-center justify-between">
                            <Badge
                              variant={pa.priority === 'High' ? 'destructive' : 'secondary'}
                              className="text-[10px] py-0 px-1.5"
                            >
                              {pa.priority} Priority
                            </Badge>
                            <span className="text-[11px] font-medium text-foreground">{pa.issue}</span>
                          </div>
                          <p className="text-muted-foreground text-[11px] leading-relaxed pt-1">
                            👉 {pa.recommendation}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* SECTION 1: GENERATED LESSON PLAN */}
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <div className="flex items-center gap-2">
                <BookOpen className="size-5 text-primary" />
                <h3 className="font-display text-lg font-bold text-foreground">
                  Generated Lesson Plan
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="xs"
                  onClick={handleAnalyzeQuality}
                  disabled={isAnalyzingQuality}
                  className="gap-1 text-xs text-primary border-primary/40 hover:bg-primary/5 font-semibold"
                >
                  <Sparkles className={`size-3.5 ${isAnalyzingQuality ? 'animate-spin text-primary' : ''}`} />
                  {isAnalyzingQuality
                    ? 'Evaluating...'
                    : qualityAnalysis
                      ? 'Re-analyze Quality'
                      : 'Analyze Quality with AI'}
                </Button>
                {!isEditingPlan && (
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={handleStartEditPlan}
                    className="gap-1 text-xs text-primary border-primary/40 hover:bg-primary/5 font-semibold"
                  >
                    <Edit3 className="size-3.5" />
                    Edit Lesson Plan
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="xs"
                  onClick={handleExportLessonPlanPDF}
                  className="gap-1 text-xs"
                >
                  <FileDown className="size-3.5" />
                  Export Lesson Plan PDF
                </Button>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-12">
              <div className="space-y-6 lg:col-span-8">
                {/* 1. Learning Objectives & Prerequisites */}
                <Card className={isEditingPlan ? 'border-primary/50 bg-card' : ''}>
                  <CardHeader className="pb-3 border-b border-border">
                    <CardTitle className="text-sm font-semibold flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Target className="size-4 text-primary" />
                        Learning Objectives & Prerequisites
                      </span>
                      {isEditingPlan && <Badge variant="outline" className="text-[10px] text-primary">Editable</Badge>}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-4 text-xs">
                    <div>
                      <h4 className="font-semibold text-foreground mb-1">Target Objectives:</h4>
                      {isEditingPlan && editedPlanContent ? (
                        <div className="space-y-2">
                          {editedPlanContent.learningObjectives.map((obj, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <input
                                type="text"
                                value={obj}
                                onChange={(e) => {
                                  const updated = [...editedPlanContent.learningObjectives]
                                  updated[i] = e.target.value
                                  setEditedPlanContent({ ...editedPlanContent, learningObjectives: updated })
                                }}
                                className="h-8 flex-1 rounded border border-input bg-card px-2.5 text-xs outline-none focus:ring-1 focus:ring-primary"
                              />
                              <Button
                                variant="ghost"
                                size="xs"
                                onClick={() => {
                                  const updated = editedPlanContent.learningObjectives.filter((_, idx) => idx !== i)
                                  setEditedPlanContent({ ...editedPlanContent, learningObjectives: updated })
                                }}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="size-3" />
                              </Button>
                            </div>
                          ))}
                          <Button
                            variant="outline"
                            size="xs"
                            onClick={() => {
                              setEditedPlanContent({
                                ...editedPlanContent,
                                learningObjectives: [...editedPlanContent.learningObjectives, 'New learning objective...'],
                              })
                            }}
                            className="gap-1 text-[11px]"
                          >
                            <Plus className="size-3" /> Add Objective
                          </Button>
                        </div>
                      ) : (
                        <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                          {(editedPlanContent?.learningObjectives || [activePlan.learningObjective]).map(
                            (obj, i) => (
                              <li key={i}>{obj}</li>
                            ),
                          )}
                        </ul>
                      )}
                    </div>

                    <div className="border-t border-border pt-3">
                      <h4 className="font-semibold text-foreground mb-1">Prerequisites & Prior Knowledge:</h4>
                      {isEditingPlan && editedPlanContent ? (
                        <div className="space-y-2">
                          {(editedPlanContent.prerequisites || []).map((p, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <input
                                type="text"
                                value={p}
                                onChange={(e) => {
                                  const updated = [...(editedPlanContent.prerequisites || [])]
                                  updated[i] = e.target.value
                                  setEditedPlanContent({ ...editedPlanContent, prerequisites: updated })
                                }}
                                className="h-8 flex-1 rounded border border-input bg-card px-2.5 text-xs outline-none focus:ring-1 focus:ring-primary"
                              />
                              <Button
                                variant="ghost"
                                size="xs"
                                onClick={() => {
                                  const updated = (editedPlanContent.prerequisites || []).filter((_, idx) => idx !== i)
                                  setEditedPlanContent({ ...editedPlanContent, prerequisites: updated })
                                }}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="size-3" />
                              </Button>
                            </div>
                          ))}
                          <Button
                            variant="outline"
                            size="xs"
                            onClick={() => {
                              setEditedPlanContent({
                                ...editedPlanContent,
                                prerequisites: [...(editedPlanContent.prerequisites || []), 'New prerequisite...'],
                              })
                            }}
                            className="gap-1 text-[11px]"
                          >
                            <Plus className="size-3" /> Add Prerequisite
                          </Button>
                        </div>
                      ) : (
                        <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                          {(editedPlanContent?.prerequisites || []).map((p, i) => (
                            <li key={i}>{p}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* 2. Introduction / Hook */}
                {editedPlanContent?.introduction && (
                  <Card className={isEditingPlan ? 'border-primary/50 bg-card' : ''}>
                    <CardHeader className="pb-3 border-b border-border">
                      <CardTitle className="text-sm font-semibold flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <Clock className="size-4 text-primary" />
                          Introduction & Warm-up
                        </span>
                        {isEditingPlan && (
                          <div className="flex items-center gap-1">
                            <span className="text-[11px] text-muted-foreground">Duration:</span>
                            <input
                              type="number"
                              min={1}
                              max={60}
                              value={editedPlanContent.introduction.durationMinutes || 5}
                              onChange={(e) => {
                                setEditedPlanContent({
                                  ...editedPlanContent,
                                  introduction: {
                                    ...editedPlanContent.introduction,
                                    durationMinutes: Number(e.target.value),
                                  },
                                })
                              }}
                              className="h-6 w-12 rounded border border-input bg-card px-1 text-xs text-center font-bold"
                            />
                            <span className="text-[11px] text-muted-foreground">min</span>
                          </div>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-3 text-xs">
                      {isEditingPlan ? (
                        <div className="space-y-3">
                          <div>
                            <label className="font-semibold text-primary block mb-1">Engaging Hook:</label>
                            <textarea
                              rows={2}
                              value={editedPlanContent.introduction.hook}
                              onChange={(e) => {
                                setEditedPlanContent({
                                  ...editedPlanContent,
                                  introduction: {
                                    ...editedPlanContent.introduction,
                                    hook: e.target.value,
                                  },
                                })
                              }}
                              className="w-full rounded border border-input bg-card p-2 text-xs outline-none focus:ring-1 focus:ring-primary"
                            />
                          </div>
                          <div>
                            <label className="font-semibold text-muted-foreground block mb-1">Prior Knowledge Check:</label>
                            <textarea
                              rows={2}
                              value={editedPlanContent.introduction.priorKnowledgeCheck}
                              onChange={(e) => {
                                setEditedPlanContent({
                                  ...editedPlanContent,
                                  introduction: {
                                    ...editedPlanContent.introduction,
                                    priorKnowledgeCheck: e.target.value,
                                  },
                                })
                              }}
                              className="w-full rounded border border-input bg-card p-2 text-xs outline-none focus:ring-1 focus:ring-primary"
                            />
                          </div>
                        </div>
                      ) : (
                        <>
                          <div>
                            <span className="font-semibold text-primary">Engaging Hook: </span>
                            <p className="mt-1 text-foreground leading-relaxed">{editedPlanContent.introduction.hook}</p>
                          </div>
                          <div>
                            <span className="font-semibold text-muted-foreground">Prior Knowledge Check: </span>
                            <p className="mt-1 text-muted-foreground">{editedPlanContent.introduction.priorKnowledgeCheck}</p>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* 3. Main Concepts */}
                {editedPlanContent?.mainConcepts && (
                  <Card className={isEditingPlan ? 'border-primary/50 bg-card' : ''}>
                    <CardHeader className="pb-3 border-b border-border">
                      <CardTitle className="text-sm font-semibold flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <Lightbulb className="size-4 text-primary" />
                          Main Concepts & Core Explanations
                        </span>
                        {isEditingPlan && (
                          <Button
                            variant="outline"
                            size="xs"
                            onClick={() => {
                              setEditedPlanContent({
                                ...editedPlanContent,
                                mainConcepts: [
                                  ...editedPlanContent.mainConcepts,
                                  { name: 'New Concept', explanation: 'Explanation...', keyVocabulary: [] },
                                ],
                              })
                            }}
                            className="gap-1 text-[11px]"
                          >
                            <Plus className="size-3" /> Add Concept
                          </Button>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-3 text-xs">
                      {editedPlanContent.mainConcepts.map((mc, i) => (
                        <div key={i} className="rounded-xl border border-border p-3.5 bg-muted/20 space-y-2">
                          {isEditingPlan ? (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between gap-2">
                                <input
                                  type="text"
                                  value={mc.name}
                                  onChange={(e) => {
                                    const updated = [...editedPlanContent.mainConcepts]
                                    updated[i] = { ...updated[i], name: e.target.value }
                                    setEditedPlanContent({ ...editedPlanContent, mainConcepts: updated })
                                  }}
                                  placeholder="Concept Name"
                                  className="h-8 flex-1 rounded border border-input bg-card px-2 font-bold text-xs"
                                />
                                <Button
                                  variant="ghost"
                                  size="xs"
                                  onClick={() => {
                                    const updated = editedPlanContent.mainConcepts.filter((_, idx) => idx !== i)
                                    setEditedPlanContent({ ...editedPlanContent, mainConcepts: updated })
                                  }}
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="size-3" />
                                </Button>
                              </div>
                              <textarea
                                rows={2}
                                value={mc.explanation}
                                onChange={(e) => {
                                  const updated = [...editedPlanContent.mainConcepts]
                                  updated[i] = { ...updated[i], explanation: e.target.value }
                                  setEditedPlanContent({ ...editedPlanContent, mainConcepts: updated })
                                }}
                                placeholder="Concept Explanation"
                                className="w-full rounded border border-input bg-card p-2 text-xs"
                              />
                            </div>
                          ) : (
                            <div>
                              <strong className="text-foreground">{mc.name}: </strong>
                              <span className="text-muted-foreground leading-relaxed">{mc.explanation}</span>
                              {mc.keyVocabulary && mc.keyVocabulary.length > 0 && (
                                <div className="mt-1 text-[11px] text-muted-foreground">
                                  <em>Vocabulary: {mc.keyVocabulary.join(', ')}</em>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* 4. Step-by-Step Instructional Activities */}
                {editedPlanContent?.teachingActivities && (
                  <Card className={isEditingPlan ? 'border-primary/50 bg-card' : ''}>
                    <CardHeader className="pb-3 border-b border-border">
                      <CardTitle className="text-sm font-semibold flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <Layers className="size-4 text-primary" />
                          Step-by-Step Instructional Activities & Pacing
                        </span>
                        {isEditingPlan && (
                          <Button
                            variant="outline"
                            size="xs"
                            onClick={() => {
                              setEditedPlanContent({
                                ...editedPlanContent,
                                teachingActivities: [
                                  ...editedPlanContent.teachingActivities,
                                  {
                                    phase: 'New Phase',
                                    timeMinutes: 10,
                                    teacherActivity: 'Teacher explains...',
                                    studentActivity: 'Students practice...',
                                    differentiationNotes: '',
                                  },
                                ],
                              })
                            }}
                            className="gap-1 text-[11px]"
                          >
                            <Plus className="size-3" /> Add Activity
                          </Button>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-4 text-xs">
                      {editedPlanContent.teachingActivities.map((act, i) => (
                        <div key={i} className="rounded-xl border border-border p-3.5 bg-muted/20 space-y-2">
                          {isEditingPlan ? (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between gap-2">
                                <input
                                  type="text"
                                  value={act.phase}
                                  onChange={(e) => {
                                    const updated = [...editedPlanContent.teachingActivities]
                                    updated[i] = { ...updated[i], phase: e.target.value }
                                    setEditedPlanContent({ ...editedPlanContent, teachingActivities: updated })
                                  }}
                                  placeholder="Phase Name"
                                  className="h-8 flex-1 rounded border border-input bg-card px-2 font-bold text-xs"
                                />
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    min={1}
                                    max={60}
                                    value={act.timeMinutes}
                                    onChange={(e) => {
                                      const updated = [...editedPlanContent.teachingActivities]
                                      updated[i] = { ...updated[i], timeMinutes: Number(e.target.value) }
                                      setEditedPlanContent({ ...editedPlanContent, teachingActivities: updated })
                                    }}
                                    className="h-8 w-14 rounded border border-input bg-card px-1 text-center text-xs font-bold"
                                  />
                                  <span className="text-[11px] text-muted-foreground">min</span>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="xs"
                                  onClick={() => {
                                    const updated = editedPlanContent.teachingActivities.filter((_, idx) => idx !== i)
                                    setEditedPlanContent({ ...editedPlanContent, teachingActivities: updated })
                                  }}
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="size-3" />
                                </Button>
                              </div>

                              <div className="grid gap-2 sm:grid-cols-2">
                                <div>
                                  <label className="text-[11px] font-semibold text-foreground">Teacher Action:</label>
                                  <textarea
                                    rows={2}
                                    value={act.teacherActivity}
                                    onChange={(e) => {
                                      const updated = [...editedPlanContent.teachingActivities]
                                      updated[i] = { ...updated[i], teacherActivity: e.target.value }
                                      setEditedPlanContent({ ...editedPlanContent, teachingActivities: updated })
                                    }}
                                    className="w-full rounded border border-input bg-card p-2 text-xs"
                                  />
                                </div>
                                <div>
                                  <label className="text-[11px] font-semibold text-foreground">Student Action:</label>
                                  <textarea
                                    rows={2}
                                    value={act.studentActivity}
                                    onChange={(e) => {
                                      const updated = [...editedPlanContent.teachingActivities]
                                      updated[i] = { ...updated[i], studentActivity: e.target.value }
                                      setEditedPlanContent({ ...editedPlanContent, teachingActivities: updated })
                                    }}
                                    className="w-full rounded border border-input bg-card p-2 text-xs"
                                  />
                                </div>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-foreground text-sm">
                                  {i + 1}. {act.phase}
                                </span>
                                <Badge variant="outline" className="font-mono text-[10px]">
                                  {act.timeMinutes} mins
                                </Badge>
                              </div>
                              <div className="grid gap-2 sm:grid-cols-2 pt-1 text-muted-foreground">
                                <div>
                                  <strong className="text-foreground">Teacher Action: </strong>
                                  {act.teacherActivity}
                                </div>
                                <div>
                                  <strong className="text-foreground">Student Action: </strong>
                                  {act.studentActivity}
                                </div>
                              </div>
                              {act.differentiationNotes && (
                                <p className="text-[11px] text-primary pt-1 border-t border-border/50">
                                  💡 <em>{act.differentiationNotes}</em>
                                </p>
                              )}
                            </>
                          )}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* 5. Differentiated Student Activities */}
                {editedPlanContent?.studentActivities && (
                  <Card className={isEditingPlan ? 'border-primary/50 bg-card' : ''}>
                    <CardHeader className="pb-3 border-b border-border">
                      <CardTitle className="text-sm font-semibold flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <Sparkles className="size-4 text-primary" />
                          3-Tier Differentiated Practice (UDL)
                        </span>
                        {isEditingPlan && (
                          <Button
                            variant="outline"
                            size="xs"
                            onClick={() => {
                              setEditedPlanContent({
                                ...editedPlanContent,
                                studentActivities: [
                                  ...editedPlanContent.studentActivities,
                                  {
                                    title: 'Practice Activity',
                                    type: 'Individual',
                                    instructions: 'Instructions...',
                                    differentiation: {
                                      remedial: 'Remedial guidance...',
                                      standard: 'Standard practice...',
                                      advanced: 'Advanced extension...',
                                    },
                                  },
                                ],
                              })
                            }}
                            className="gap-1 text-[11px]"
                          >
                            <Plus className="size-3" /> Add Practice
                          </Button>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-4 text-xs">
                      {editedPlanContent.studentActivities.map((sa, i) => (
                        <div key={i} className="rounded-xl border border-border p-4 space-y-3 bg-card">
                          {isEditingPlan ? (
                            <div className="space-y-3">
                              <div className="flex items-center justify-between gap-2">
                                <input
                                  type="text"
                                  value={sa.title}
                                  onChange={(e) => {
                                    const updated = [...editedPlanContent.studentActivities]
                                    updated[i] = { ...updated[i], title: e.target.value }
                                    setEditedPlanContent({ ...editedPlanContent, studentActivities: updated })
                                  }}
                                  placeholder="Activity Title"
                                  className="h-8 flex-1 rounded border border-input bg-card px-2 font-bold text-xs"
                                />
                                <select
                                  value={sa.type}
                                  onChange={(e) => {
                                    const updated = [...editedPlanContent.studentActivities]
                                    updated[i] = { ...updated[i], type: e.target.value as any }
                                    setEditedPlanContent({ ...editedPlanContent, studentActivities: updated })
                                  }}
                                  className="h-8 rounded border border-input bg-card px-2 text-xs"
                                >
                                  <option value="Individual">Individual</option>
                                  <option value="Pair">Pair</option>
                                  <option value="Group">Group</option>
                                </select>
                                <Button
                                  variant="ghost"
                                  size="xs"
                                  onClick={() => {
                                    const updated = editedPlanContent.studentActivities.filter((_, idx) => idx !== i)
                                    setEditedPlanContent({ ...editedPlanContent, studentActivities: updated })
                                  }}
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="size-3" />
                                </Button>
                              </div>

                              <textarea
                                rows={2}
                                value={sa.instructions}
                                onChange={(e) => {
                                  const updated = [...editedPlanContent.studentActivities]
                                  updated[i] = { ...updated[i], instructions: e.target.value }
                                  setEditedPlanContent({ ...editedPlanContent, studentActivities: updated })
                                }}
                                placeholder="Instructions"
                                className="w-full rounded border border-input bg-card p-2 text-xs"
                              />

                              <div className="grid gap-2 sm:grid-cols-3">
                                <div>
                                  <label className="text-[11px] font-bold text-warning-foreground">Remedial Tier:</label>
                                  <textarea
                                    rows={2}
                                    value={sa.differentiation?.remedial || ''}
                                    onChange={(e) => {
                                      const updated = [...editedPlanContent.studentActivities]
                                      updated[i] = {
                                        ...updated[i],
                                        differentiation: { ...updated[i].differentiation, remedial: e.target.value },
                                      }
                                      setEditedPlanContent({ ...editedPlanContent, studentActivities: updated })
                                    }}
                                    className="w-full rounded border border-input bg-card p-1.5 text-xs"
                                  />
                                </div>
                                <div>
                                  <label className="text-[11px] font-bold text-primary">Standard Tier:</label>
                                  <textarea
                                    rows={2}
                                    value={sa.differentiation?.standard || ''}
                                    onChange={(e) => {
                                      const updated = [...editedPlanContent.studentActivities]
                                      updated[i] = {
                                        ...updated[i],
                                        differentiation: { ...updated[i].differentiation, standard: e.target.value },
                                      }
                                      setEditedPlanContent({ ...editedPlanContent, studentActivities: updated })
                                    }}
                                    className="w-full rounded border border-input bg-card p-1.5 text-xs"
                                  />
                                </div>
                                <div>
                                  <label className="text-[11px] font-bold text-success">Advanced Tier:</label>
                                  <textarea
                                    rows={2}
                                    value={sa.differentiation?.advanced || ''}
                                    onChange={(e) => {
                                      const updated = [...editedPlanContent.studentActivities]
                                      updated[i] = {
                                        ...updated[i],
                                        differentiation: { ...updated[i].differentiation, advanced: e.target.value },
                                      }
                                      setEditedPlanContent({ ...editedPlanContent, studentActivities: updated })
                                    }}
                                    className="w-full rounded border border-input bg-card p-1.5 text-xs"
                                  />
                                </div>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center justify-between">
                                <h4 className="font-bold text-foreground text-sm">{sa.title}</h4>
                                <Badge variant="secondary">{sa.type}</Badge>
                              </div>
                              <p className="text-muted-foreground leading-relaxed">{sa.instructions}</p>
                              {sa.differentiation && (
                                <div className="grid gap-2 sm:grid-cols-3 pt-2">
                                  <div className="rounded-lg bg-warning/10 p-2.5 border border-warning/20">
                                    <span className="font-bold text-warning-foreground block mb-1">Remedial Tier:</span>
                                    <span className="text-muted-foreground text-[11px]">{sa.differentiation.remedial}</span>
                                  </div>
                                  <div className="rounded-lg bg-primary/10 p-2.5 border border-primary/20">
                                    <span className="font-bold text-primary block mb-1">Standard Tier:</span>
                                    <span className="text-muted-foreground text-[11px]">{sa.differentiation.standard}</span>
                                  </div>
                                  <div className="rounded-lg bg-success/10 p-2.5 border border-success/20">
                                    <span className="font-bold text-success block mb-1">Advanced Tier:</span>
                                    <span className="text-muted-foreground text-[11px]">{sa.differentiation.advanced}</span>
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Lesson Plan Sidebar Column */}
              <div className="space-y-6 lg:col-span-4">
                {/* 6. Formative Exit Ticket */}
                {editedPlanContent?.assessment && (
                  <Card className={`border-primary/30 ${isEditingPlan ? 'border-primary/50 bg-card' : ''}`}>
                    <CardHeader className="pb-3 border-b border-border bg-primary/5">
                      <CardTitle className="text-sm font-semibold flex items-center justify-between text-primary">
                        <span className="flex items-center gap-2">
                          <CheckCircle2 className="size-4" />
                          Formative Exit Ticket
                        </span>
                        {isEditingPlan && (
                          <Button
                            variant="outline"
                            size="xs"
                            onClick={() => {
                              setEditedPlanContent({
                                ...editedPlanContent,
                                assessment: {
                                  ...editedPlanContent.assessment,
                                  exitTicketQuestions: [
                                    ...(editedPlanContent.assessment.exitTicketQuestions || []),
                                    { question: 'New exit question...', expectedAnswer: 'Expected answer...' },
                                  ],
                                },
                              })
                            }}
                            className="gap-1 text-[11px]"
                          >
                            <Plus className="size-3" /> Add Q
                          </Button>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-3 text-xs">
                      {editedPlanContent.assessment.exitTicketQuestions?.map((et, i) => (
                        <div key={i} className="rounded-lg border border-border p-3 space-y-1.5 bg-card">
                          {isEditingPlan ? (
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between gap-1">
                                <span className="font-semibold text-foreground">Q{i + 1}:</span>
                                <Button
                                  variant="ghost"
                                  size="xs"
                                  onClick={() => {
                                    const updated = editedPlanContent.assessment.exitTicketQuestions.filter((_, idx) => idx !== i)
                                    setEditedPlanContent({
                                      ...editedPlanContent,
                                      assessment: { ...editedPlanContent.assessment, exitTicketQuestions: updated },
                                    })
                                  }}
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="size-3" />
                                </Button>
                              </div>
                              <input
                                type="text"
                                value={et.question}
                                onChange={(e) => {
                                  const updated = [...editedPlanContent.assessment.exitTicketQuestions]
                                  updated[i] = { ...updated[i], question: e.target.value }
                                  setEditedPlanContent({
                                    ...editedPlanContent,
                                    assessment: { ...editedPlanContent.assessment, exitTicketQuestions: updated },
                                  })
                                }}
                                placeholder="Exit Ticket Question"
                                className="h-8 w-full rounded border border-input bg-card px-2 text-xs"
                              />
                              <input
                                type="text"
                                value={et.expectedAnswer}
                                onChange={(e) => {
                                  const updated = [...editedPlanContent.assessment.exitTicketQuestions]
                                  updated[i] = { ...updated[i], expectedAnswer: e.target.value }
                                  setEditedPlanContent({
                                    ...editedPlanContent,
                                    assessment: { ...editedPlanContent.assessment, exitTicketQuestions: updated },
                                  })
                                }}
                                placeholder="Expected Answer"
                                className="h-8 w-full rounded border border-input bg-card px-2 text-xs text-success font-medium"
                              />
                            </div>
                          ) : (
                            <>
                              <span className="font-semibold text-foreground">Q{i + 1}: {et.question}</span>
                              <p className="text-success font-medium text-[11px]">✓ Expected: {et.expectedAnswer}</p>
                            </>
                          )}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* 7. Homework */}
                {editedPlanContent?.homework && (
                  <Card className={isEditingPlan ? 'border-primary/50 bg-card' : ''}>
                    <CardHeader className="pb-3 border-b border-border">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <BookOpen className="size-4 text-primary" />
                        Homework & Extension
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-3 text-xs">
                      {isEditingPlan ? (
                        <div className="space-y-3">
                          <div>
                            <label className="font-semibold text-foreground block mb-1">Core Assignment:</label>
                            <textarea
                              rows={2}
                              value={editedPlanContent.homework.task}
                              onChange={(e) => {
                                setEditedPlanContent({
                                  ...editedPlanContent,
                                  homework: { ...editedPlanContent.homework, task: e.target.value },
                                })
                              }}
                              className="w-full rounded border border-input bg-card p-2 text-xs"
                            />
                          </div>
                          <div>
                            <label className="font-semibold text-primary block mb-1">Advanced Extension Challenge:</label>
                            <textarea
                              rows={2}
                              value={editedPlanContent.homework.extensionChallenge || ''}
                              onChange={(e) => {
                                setEditedPlanContent({
                                  ...editedPlanContent,
                                  homework: { ...editedPlanContent.homework, extensionChallenge: e.target.value },
                                })
                              }}
                              className="w-full rounded border border-input bg-card p-2 text-xs"
                            />
                          </div>
                        </div>
                      ) : (
                        <>
                          <div>
                            <strong className="text-foreground">Core Assignment:</strong>
                            <p className="text-muted-foreground mt-1">{editedPlanContent.homework.task}</p>
                          </div>
                          {editedPlanContent.homework.extensionChallenge && (
                            <div className="border-t border-border pt-2">
                              <strong className="text-primary">Advanced Extension:</strong>
                              <p className="text-muted-foreground mt-1">{editedPlanContent.homework.extensionChallenge}</p>
                            </div>
                          )}
                        </>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>

          {/* SECTION: ATTACHED LEARNING MATERIALS (PDF) */}
          <Card className="border-border bg-card shadow-xs">
            <CardHeader className="border-b border-border pb-3 bg-muted/20 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="size-4 text-primary" />
                <CardTitle className="text-sm font-bold">
                  Attached Learning Materials ({attachedMaterials.length})
                </CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={pdfInputRef}
                  onChange={handleUploadPdf}
                  accept=".pdf"
                  className="hidden"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => pdfInputRef.current?.click()}
                  disabled={isUploadingPdf}
                  className="gap-1.5 text-xs font-semibold"
                >
                  <Upload className="size-3.5" />
                  {isUploadingPdf ? 'Uploading PDF...' : 'Upload PDF from Computer'}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {isUploadingPdf && (
                <div className="space-y-1.5 rounded-lg border border-primary/20 bg-primary/5 p-3">
                  <div className="flex justify-between text-xs font-semibold text-primary">
                    <span>Uploading PDF document to storage...</span>
                    <span>{pdfUploadProgress}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-primary/20">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${pdfUploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {attachedMaterials.length === 0 && !isUploadingPdf ? (
                <div className="rounded-lg border border-dashed border-border p-6 text-center">
                  <FileText className="mx-auto size-8 text-muted-foreground/50 mb-2" />
                  <p className="text-xs font-semibold text-foreground">No PDF learning materials attached yet</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 mb-3">
                    Upload syllabus chapters, lecture slides, or textbook excerpts (.pdf, up to 50MB) for students.
                  </p>
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={() => pdfInputRef.current?.click()}
                    className="gap-1 text-xs"
                  >
                    <Upload className="size-3" />
                    Select PDF File
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {attachedMaterials.map((mat) => (
                    <div
                      key={mat.id}
                      className="flex items-center justify-between rounded-lg border border-border bg-background p-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="flex size-8 items-center justify-center rounded bg-destructive/10 text-destructive font-bold text-[10px]">
                          PDF
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{mat.name}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {mat.sizeKb ? `${mat.sizeKb} KB` : 'PDF Document'} • Uploaded for {mat.topic}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {mat.fileUrl && (
                          <>
                            <a
                              href={mat.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 rounded border border-border px-2 py-1 text-[11px] font-semibold text-foreground hover:bg-muted"
                            >
                              <Eye className="size-3 text-primary" /> View PDF
                            </a>
                            <a
                              href={mat.fileUrl}
                              download={mat.name}
                              className="inline-flex items-center gap-1 rounded border border-border px-2 py-1 text-[11px] font-semibold text-foreground hover:bg-muted"
                            >
                              <Download className="size-3 text-primary" /> Download
                            </a>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => setAttachedMaterials((prev) => prev.filter((m: any) => m.id !== mat.id))}
                          className="rounded p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          title="Remove from lesson plan"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* SECTION 2: GENERATED ASSOCIATED QUIZ */}
          {activeQuiz && (
            <div className="space-y-6 pt-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-border pb-2">
                <div className="flex items-center gap-2">
                  <ListOrdered className="size-5 text-primary" />
                  <h3 className="font-display text-lg font-bold text-foreground">
                    Generated Formative Quiz ({activeQuiz.questions.length} Questions)
                  </h3>
                  <Badge
                    variant={activeQuiz.status === 'Approved' ? 'success' : 'warning'}
                    className="text-[10px] font-bold uppercase"
                  >
                    {activeQuiz.status === 'Approved' ? 'PUBLISHED' : 'DRAFT'}
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="default"
                    size="xs"
                    onClick={handleAddQuizQuestion}
                    className="gap-1 text-xs font-semibold shadow-xs"
                  >
                    <Plus className="size-3.5" />
                    Add Question
                  </Button>
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={handleExportStudentQuizPDF}
                    className="gap-1 text-xs"
                  >
                    <FileDown className="size-3.5" />
                    Export Quiz PDF
                  </Button>
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={handleExportAnswerKeyPDF}
                    className="gap-1 text-xs"
                  >
                    <FileCheck2 className="size-3.5 text-primary" />
                    Export Answer Key PDF
                  </Button>
                </div>
              </div>

              {/* Quiz Questions Cards */}
              <div className="space-y-4">
                {activeQuiz.questions.map((q, idx) => {
                  const isEditingQ = editingQuestionId === q.id

                  return (
                    <Card key={q.id} className="transition-all hover:border-primary/40">
                      <CardHeader className="flex flex-row items-start justify-between pb-3 border-b border-border/60">
                        <div className="flex items-center gap-2.5">
                          <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                            Q{idx + 1}
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
                              isEditingQ ? handleSaveInlineQuestion() : handleStartEditQuestion(q)
                            }
                            className="gap-1 text-xs text-muted-foreground hover:text-foreground"
                          >
                            <Edit3 className="size-3" />
                            {isEditingQ ? 'Done' : 'Edit Question'}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => handleDeleteQuizQuestion(q.id)}
                            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            title="Delete question"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-4 pt-4 text-sm">
                        {isEditingQ && editQuestionData ? (
                          /* Inline Question Editor */
                          <div className="space-y-3">
                            <div>
                              <label className="text-xs font-semibold uppercase text-muted-foreground">
                                Question Prompt
                              </label>
                              <textarea
                                value={editQuestionData.question}
                                onChange={(e) =>
                                  setEditQuestionData({
                                    ...editQuestionData,
                                    question: e.target.value,
                                  })
                                }
                                rows={2}
                                className="mt-1 w-full rounded-lg border border-input bg-card p-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2"
                              />
                            </div>

                            {editQuestionData.options && editQuestionData.options.length > 0 && (
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <label className="text-xs font-semibold uppercase text-muted-foreground">
                                    Options
                                  </label>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="xs"
                                    onClick={() => {
                                      const nextOpts = [...(editQuestionData.options || [])]
                                      nextOpts.push(`Option ${String.fromCharCode(65 + nextOpts.length)}`)
                                      setEditQuestionData({ ...editQuestionData, options: nextOpts })
                                    }}
                                    className="h-6 text-[10px] text-primary hover:underline gap-1"
                                  >
                                    <Plus className="size-3" /> Add Option
                                  </Button>
                                </div>
                                {editQuestionData.options.map((opt, optIdx) => (
                                  <div key={optIdx} className="flex items-center gap-2">
                                    <span className="font-mono text-xs font-bold text-muted-foreground w-4">
                                      {String.fromCharCode(65 + optIdx)}.
                                    </span>
                                    <input
                                      type="text"
                                      value={opt}
                                      onChange={(e) => {
                                        const nextOpts = [...editQuestionData.options]
                                        nextOpts[optIdx] = e.target.value
                                        setEditQuestionData({
                                          ...editQuestionData,
                                          options: nextOpts,
                                        })
                                      }}
                                      className="h-8 flex-1 rounded-lg border border-input bg-card px-2.5 text-xs outline-none focus-visible:border-ring focus-visible:ring-2"
                                    />
                                    {editQuestionData.options.length > 2 && (
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon-xs"
                                        onClick={() => {
                                          const nextOpts = editQuestionData.options.filter((_, i) => i !== optIdx)
                                          setEditQuestionData({ ...editQuestionData, options: nextOpts })
                                        }}
                                        className="text-muted-foreground hover:text-destructive"
                                      >
                                        <X className="size-3" />
                                      </Button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}

                            <div className="grid gap-3 sm:grid-cols-2">
                              <div>
                                <label className="text-xs font-semibold uppercase text-muted-foreground">
                                  Correct Answer
                                </label>
                                {editQuestionData.options && editQuestionData.options.length > 0 ? (
                                  <select
                                    value={editQuestionData.answer}
                                    onChange={(e) =>
                                      setEditQuestionData({
                                        ...editQuestionData,
                                        answer: e.target.value,
                                      })
                                    }
                                    className="mt-1 h-8 w-full rounded-lg border border-input bg-card px-2.5 text-xs outline-none focus-visible:border-ring font-medium"
                                  >
                                    {editQuestionData.options.map((opt, i) => (
                                      <option key={i} value={opt}>
                                        {opt}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <input
                                    type="text"
                                    value={editQuestionData.answer}
                                    onChange={(e) =>
                                      setEditQuestionData({
                                        ...editQuestionData,
                                        answer: e.target.value,
                                      })
                                    }
                                    className="mt-1 h-8 w-full rounded-lg border border-input bg-card px-2.5 text-xs outline-none focus-visible:border-ring focus-visible:ring-2"
                                  />
                                )}
                              </div>
                              <div>
                                <label className="text-xs font-semibold uppercase text-muted-foreground">
                                  Explanation / Rationale
                                </label>
                                <input
                                  type="text"
                                  value={editQuestionData.explanation}
                                  onChange={(e) =>
                                    setEditQuestionData({
                                      ...editQuestionData,
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
                              <Button size="xs" onClick={handleSaveInlineQuestion}>
                                Save Question
                              </Button>
                            </div>
                          </div>
                        ) : (
                          /* Display Mode */
                          <>
                            <p className="font-medium text-foreground">{q.question}</p>

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
            </div>
          )}

          {/* Bottom Actions Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <Link href="/student/quizzes">
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
              {activePlan.status !== 'Approved' && (
                <Button
                  size="sm"
                  onClick={handleApproveAndPublish}
                  disabled={isSaving}
                  className="gap-1.5 text-xs shadow-sm bg-success hover:bg-success/90"
                >
                  <CheckCircle2 className="size-3.5" />
                  Approve & Publish to Students
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
