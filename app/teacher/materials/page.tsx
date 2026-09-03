'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  Boxes,
  Check,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  Eye,
  FileCheck,
  FileCheck2,
  FileText,
  Filter,
  Layers,
  ListOrdered,
  Milestone,
  MoreVertical,
  Plus,
  RotateCw,
  Search,
  Sparkles,
  Target,
  Trash2,
  Upload,
  Video,
  Wand2,
  Zap,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LevelBadge } from '@/components/shared/badges'
import { resources } from '@/lib/mock-data'
import { useAppSession } from '@/lib/session-context'
import type { Material, MaterialAnalysis, CourseLearningPath } from '@/lib/types'
import { useToast } from '@/components/shared/toast'

export default function MaterialsPage() {
  const { toast } = useToast()
  const {
    materials,
    uploadMaterial,
    analyzeTopic,
    analyses,
    setSelectedTopic,
    approvalStatuses,
  } = useAppSession()

  // Source selection: 'uploaded_pdf' | 'class_lesson' | 'demo'
  const [contentSource, setContentSource] = React.useState<'uploaded_pdf' | 'class_lesson' | 'demo'>('uploaded_pdf')

  // Search & Filters
  const [search, setSearch] = React.useState('')
  const [selectedType, setSelectedType] = React.useState<string>('All')
  const [selectedTopicFilter, setSelectedTopicFilter] = React.useState<string>('All')

  // Upload state
  const [isUploading, setIsUploading] = React.useState(false)
  const [uploadProgress, setUploadProgress] = React.useState(0)
  const [isDragging, setIsDragging] = React.useState(false)
  const [latestUploadedMaterial, setLatestUploadedMaterial] = React.useState<Material | null>(null)

  // Analysis & Learning Path state
  const [isAnalyzing, setIsAnalyzing] = React.useState(false)
  const [activeAnalysis, setActiveAnalysis] = React.useState<MaterialAnalysis | null>(null)
  const [isGeneratingPath, setIsGeneratingPath] = React.useState(false)
  const [activeLearningPath, setActiveLearningPath] = React.useState<CourseLearningPath | null>(null)

  // Real class & topic linking
  const [classes, setClasses] = React.useState<any[]>([])
  const [selectedUploadClassId, setSelectedUploadClassId] = React.useState<string>('')
  const [selectedUploadTopic, setSelectedUploadTopic] = React.useState<string>('')
  const fileInputRef = React.useRef<HTMLInputElement | null>(null)

  // 1. Load saved learning path and analysis from sessionStorage on mount
  React.useEffect(() => {
    try {
      const savedPath = sessionStorage.getItem('teachai_learning_path_cache')
      if (savedPath) {
        const parsed = JSON.parse(savedPath)
        if (parsed?.modules && parsed.modules.length > 0) {
          setActiveLearningPath(parsed)
        }
      }
      const savedAnalysis = sessionStorage.getItem('teachai_material_analysis_cache')
      if (savedAnalysis) {
        setActiveAnalysis(JSON.parse(savedAnalysis))
      }
    } catch {}
  }, [])

  // 2. Fetch classes from database
  React.useEffect(() => {
    fetch('/api/classes')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.classes && data.classes.length > 0) {
          setClasses(data.classes)
          setSelectedUploadClassId(data.classes[0].id)
          if (data.classes[0].topics && data.classes[0].topics.length > 0) {
            setSelectedUploadTopic(data.classes[0].topics[0].title)
          }
        }
      })
      .catch(() => {})
  }, [])

  const currentClass = classes.find((c) => c.id === selectedUploadClassId) || classes[0]

  const handleSelectClass = (clsId: string) => {
    setSelectedUploadClassId(clsId)
    const cls = classes.find((c) => c.id === clsId)
    if (cls?.topics && cls.topics.length > 0) {
      setSelectedUploadTopic(cls.topics[0].title)
    }
  }

  // Handle PDF upload from computer
  const handleRealFileUpload = async (file: File) => {
    const isPdf = file.name.toLowerCase().endsWith('.pdf') || file.type.includes('pdf')
    if (!isPdf) {
      toast({
        title: 'Invalid File Format',
        description: 'Please select a PDF document (.pdf) from your computer.',
      })
      return
    }

    if (file.size > 50 * 1024 * 1024) {
      toast({
        title: 'File Too Large',
        description: 'Maximum PDF file size is 50MB.',
      })
      return
    }

    setIsUploading(true)
    setUploadProgress(25)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('name', file.name)

    // Only assign class association if user explicitly opted to link to a class
    if (contentSource === 'class_lesson') {
      const targetTopic = selectedUploadTopic || currentClass?.topics?.[0]?.title || ''
      const targetSubject = currentClass?.subject || ''
      if (targetSubject) formData.append('subject', targetSubject)
      if (targetTopic) formData.append('topic', targetTopic)
      if (selectedUploadClassId) formData.append('classId', selectedUploadClassId)
    }

    try {
      setUploadProgress(65)
      const res = await fetch('/api/materials', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      setUploadProgress(100)

      if (res.ok && data.success && data.material) {
        const mat = data.material
        setLatestUploadedMaterial(mat)
        uploadMaterial(mat)

        toast({
          title: 'Course PDF Processed! 📄',
          description: `"${file.name}" analyzed: Subject "${mat.subject}", Topic "${mat.topic}".`,
        })

        // Automatically generate Learning Path and Concept Analysis from the uploaded PDF
        handleGenerateLearningPath(mat)
        handleRunAnalysis(mat)
      } else {
        toast({
          title: 'Upload Failed',
          description: data.error || 'Unable to extract content from this PDF. Please upload a readable course material PDF.',
        })
      }
    } catch {
      toast({
        title: 'Connection Error',
        description: 'Failed to upload PDF file to storage.',
      })
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // Generate Course Learning Path using real Gemini AI
  const handleGenerateLearningPath = async (targetMaterial?: Material) => {
    setIsGeneratingPath(true)
    try {
      const payload: any = {
        sourceType: contentSource,
      }

      if (contentSource === 'uploaded_pdf') {
        const mat = targetMaterial || latestUploadedMaterial || materials.find((m) => m.type === 'PDF')
        if (!mat) {
          toast({
            title: 'No Course Material Provided',
            description: 'No readable course material was provided. Please upload a course material PDF.',
          })
          setIsGeneratingPath(false)
          return
        }
        payload.materialId = mat.id
        payload.courseTitle = mat.topic || mat.name.replace(/\.pdf$/i, '')
        payload.subject = mat.subject
        payload.sourceName = mat.name
        if (mat.rawText) payload.rawContent = mat.rawText
      } else if (contentSource === 'class_lesson') {
        payload.classId = selectedUploadClassId
        if (currentClass) {
          payload.courseTitle = currentClass.name
          payload.subject = currentClass.subject
        }
      }

      const res = await fetch('/api/learning-path/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        toast({
          title: 'Learning Path Generation Failed',
          description: data.error || 'Failed to generate course learning path with Gemini AI.',
        })
        return
      }

      setActiveLearningPath(data.learningPath)
      try {
        sessionStorage.setItem('teachai_learning_path_cache', JSON.stringify(data.learningPath))
      } catch {}

      toast({
        title: 'Course Learning Path Generated! 🗺️',
        description: `Constructed ${data.learningPath.modules.length} sequenced learning modules for "${data.learningPath.courseTitle}".`,
      })
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Could not contact learning path engine.',
      })
    } finally {
      setIsGeneratingPath(false)
    }
  }

  // Run Pedagogical Concept & Misconception Analysis
  const handleRunAnalysis = async (mat: Material) => {
    setIsAnalyzing(true)
    setSelectedTopic(mat.topic)
    try {
      const res = await analyzeTopic(mat.topic, mat.name, {
        subject: mat.subject,
        materialId: mat.id,
      })
      setActiveAnalysis(res)
      try {
        sessionStorage.setItem('teachai_material_analysis_cache', JSON.stringify(res))
      } catch {}
      toast({
        title: 'Pedagogical Analysis Complete ✨',
        description: `Gemini extracted ${res.detectedConcepts.length} core concepts and structured pedagogical metadata.`,
      })
    } catch (err) {
      toast({
        title: 'Analysis Failed ⚠️',
        description: err instanceof Error ? err.message : 'Could not analyze material with Gemini AI.',
      })
    } finally {
      setIsAnalyzing(false)
    }
  }

  const filteredMaterials = materials.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.subject.toLowerCase().includes(search.toLowerCase()) ||
      m.topic.toLowerCase().includes(search.toLowerCase())
    const matchesType = selectedType === 'All' || m.type === selectedType
    const matchesTopic = selectedTopicFilter === 'All' || m.topic === selectedTopicFilter
    return matchesSearch && matchesType && matchesTopic
  })

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <PageHeader
        title="Learning Materials & AI Learning Path"
        description="Upload textbooks, course syllabi, and lecture slide decks. TeachAI extracts core concepts, diagnoses misconceptions, and generates structured, sequenced Course Learning Paths."
      />

      {/* Explicit Content Source Selector */}
      <Card className="border-primary/30 bg-card shadow-sm">
        <CardHeader className="border-b border-border pb-3 bg-muted/20">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2">
              <Milestone className="size-4.5 text-primary" />
              <CardTitle className="text-sm font-bold">Content Source Selection</CardTitle>
            </div>
            <span className="text-xs text-muted-foreground">The uploaded material is the primary source for AI generation</span>
          </div>
        </CardHeader>
        <CardContent className="p-5 space-y-4">
          <div className="flex flex-wrap gap-4 text-xs font-semibold">
            <label className="flex items-center gap-2 cursor-pointer rounded-lg border border-border p-3 transition-colors hover:bg-muted/40 has-checked:border-primary has-checked:bg-primary/5">
              <input
                type="radio"
                name="matSource"
                value="uploaded_pdf"
                checked={contentSource === 'uploaded_pdf'}
                onChange={() => setContentSource('uploaded_pdf')}
                className="text-primary focus:ring-primary"
              />
              <Upload className="size-4 text-primary" />
              <span>Upload Course Material (PDF from Computer)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer rounded-lg border border-border p-3 transition-colors hover:bg-muted/40 has-checked:border-primary has-checked:bg-primary/5">
              <input
                type="radio"
                name="matSource"
                value="class_lesson"
                checked={contentSource === 'class_lesson'}
                onChange={() => setContentSource('class_lesson')}
                className="text-primary focus:ring-primary"
              />
              <BookOpen className="size-4 text-primary" />
              <span>Use My Class / Lesson Content (from Database)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer rounded-lg border border-border p-3 transition-colors hover:bg-muted/40 has-checked:border-primary has-checked:bg-primary/5">
              <input
                type="radio"
                name="matSource"
                value="demo"
                checked={contentSource === 'demo'}
                onChange={() => setContentSource('demo')}
                className="text-primary focus:ring-primary"
              />
              <Layers className="size-4 text-primary" />
              <span>Demo Mode (DBMS Showcase)</span>
            </label>
          </div>

          {/* Source Sub-controls */}
          {contentSource === 'uploaded_pdf' && (
            <div className="space-y-3">
              <div
                onDragOver={(e) => {
                  e.preventDefault()
                  setIsDragging(true)
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault()
                  setIsDragging(false)
                  const f = e.dataTransfer.files?.[0]
                  if (f) handleRealFileUpload(f)
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-colors ${
                  isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/60 hover:bg-muted/30'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => e.target.files?.[0] && handleRealFileUpload(e.target.files[0])}
                  accept=".pdf"
                  className="hidden"
                />
                <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Upload className="size-6" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground">
                    Click to select Course Material PDF from your computer or drag and drop here
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Supports Python Programming, Biology, Physics, Mathematics, Economics, etc. (up to 50MB)
                  </p>
                </div>
              </div>

              {isUploading && (
                <div className="space-y-1.5 rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs">
                  <div className="flex justify-between font-medium text-foreground">
                    <span>Extracting pedagogical content from PDF...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {latestUploadedMaterial && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-success/30 bg-success/[0.04] p-3 text-xs">
                  <div>
                    <p className="font-bold text-foreground">Active Source: {latestUploadedMaterial.name}</p>
                    <p className="text-muted-foreground">
                      Subject: <strong>{latestUploadedMaterial.subject}</strong> · Topic: <strong>{latestUploadedMaterial.topic}</strong>
                    </p>
                  </div>
                  <Button
                    size="xs"
                    onClick={() => handleGenerateLearningPath(latestUploadedMaterial)}
                    disabled={isGeneratingPath}
                    className="gap-1.5 text-xs self-start sm:self-auto"
                  >
                    <Sparkles className="size-3.5" />
                    Regenerate Learning Path
                  </Button>
                </div>
              )}
            </div>
          )}

          {contentSource === 'class_lesson' && (
            <div className="space-y-3 rounded-lg border border-border p-3 bg-muted/20 text-xs">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground">Class:</span>
                  <select
                    value={selectedUploadClassId}
                    onChange={(e) => handleSelectClass(e.target.value)}
                    className="h-8 rounded border border-input bg-card px-2 text-xs font-semibold"
                  >
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.subject})
                      </option>
                    ))}
                  </select>
                </div>
                <Button
                  size="xs"
                  onClick={() => handleGenerateLearningPath()}
                  disabled={isGeneratingPath}
                  className="gap-1.5"
                >
                  <Sparkles className="size-3.5" />
                  Generate Learning Path from Class Syllabus
                </Button>
              </div>
              {currentClass && (
                <p className="text-muted-foreground">
                  Using registered syllabus topics from class <strong>{currentClass.name}</strong> ({currentClass.subject}).
                </p>
              )}
            </div>
          )}

          {contentSource === 'demo' && (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/[0.04] p-3 text-xs">
              <div>
                <p className="font-bold text-primary">Hackathon Demo Showcase: Database Management Systems</p>
                <p className="text-muted-foreground">Pre-loaded conceptual ER model and relational schema curriculum.</p>
              </div>
              <Button
                size="xs"
                onClick={() => handleGenerateLearningPath()}
                disabled={isGeneratingPath}
                className="gap-1.5"
              >
                <Sparkles className="size-3.5" />
                Generate Demo Learning Path
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Generated Course Learning Path View */}
      {isGeneratingPath ? (
        <Card className="border-primary/30 p-8 text-center bg-card shadow-sm space-y-3">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mx-auto">
            <Sparkles className="size-6 animate-spin" />
          </div>
          <h4 className="font-display text-base font-bold text-foreground">
            Architecting Modular Course Learning Path with Gemini AI…
          </h4>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Decomposing the uploaded material into sequenced modules, learning outcomes, and assessment checkpoints.
          </p>
        </Card>
      ) : activeLearningPath ? (
        <Card className="border-primary/40 bg-card shadow-sm">
          <CardHeader className="border-b border-border pb-4 bg-muted/10">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="default" className="text-xs font-semibold">
                    Course Learning Path
                  </Badge>
                  <Badge variant="outline" className="text-xs font-mono">
                    Subject: {activeLearningPath.subject}
                  </Badge>
                  <Badge variant="outline" className="text-xs font-mono">
                    Duration: ~{activeLearningPath.totalDurationWeeks} Weeks
                  </Badge>
                </div>
                <CardTitle className="text-lg font-bold">
                  {activeLearningPath.courseTitle}
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Source Material: <strong className="text-foreground">{activeLearningPath.sourceMetadata.sourceName}</strong> · Generated from: <strong className="text-foreground">{activeLearningPath.sourceMetadata.sourceType === 'uploaded_pdf' ? 'Uploaded Course Material' : activeLearningPath.sourceMetadata.sourceType === 'class_lesson' ? 'Class Syllabus' : 'Showcase Demo'}</strong>
                </p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <Badge variant="success" className="gap-1 py-1 px-2.5 text-xs">
                  <CheckCircle2 className="size-3.5" />
                  {activeLearningPath.modules.length} Modules Sequenced
                </Badge>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            {/* Overview & Audience */}
            <div className="rounded-xl border border-border bg-muted/20 p-4 text-xs space-y-1.5">
              <p className="font-semibold text-foreground">Course Overview:</p>
              <p className="text-muted-foreground leading-relaxed">{activeLearningPath.overview}</p>
              <p className="text-muted-foreground pt-1">
                <strong>Target Audience:</strong> {activeLearningPath.targetAudience}
              </p>
            </div>

            {/* Sequenced Modules List */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <ListOrdered className="size-4 text-primary" />
                Sequenced Course Curriculum Modules
              </h4>

              <div className="grid gap-3 sm:grid-cols-2">
                {activeLearningPath.modules.map((mod) => (
                  <Card key={mod.moduleNumber} className="border border-border/80 bg-card p-4 transition-all hover:border-primary/50 hover:shadow-xs">
                    <div className="flex items-start justify-between gap-2 border-b border-border/50 pb-2 mb-2.5">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                          Module {mod.moduleNumber}
                        </span>
                        <h5 className="font-bold text-sm text-foreground">{mod.title}</h5>
                      </div>
                      <Badge variant="outline" className="text-[10px] font-mono shrink-0">
                        {mod.estimatedHours} Hours
                      </Badge>
                    </div>

                    <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                      {mod.description}
                    </p>

                    <div className="space-y-2 text-[11px]">
                      <div>
                        <span className="font-semibold text-foreground">Key Concepts:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {mod.keyConcepts.map((kc, i) => (
                            <Badge key={i} variant="secondary" className="text-[10px] font-normal">
                              {kc}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {mod.learningOutcomes.length > 0 && (
                        <div>
                          <span className="font-semibold text-foreground">Learning Outcomes:</span>
                          <ul className="mt-0.5 space-y-0.5 text-muted-foreground">
                            {mod.learningOutcomes.map((lo, i) => (
                              <li key={i} className="flex items-start gap-1">
                                <span className="text-primary font-bold">•</span>
                                <span>{lo}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="pt-1 text-muted-foreground">
                        <strong>Check:</strong> {mod.assessmentType}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* Prerequisites & Pitfalls */}
            <div className="grid gap-4 sm:grid-cols-2 pt-2 border-t border-border">
              {activeLearningPath.prerequisites.length > 0 && (
                <div className="rounded-lg bg-muted/20 border border-border p-3 text-xs space-y-1">
                  <h5 className="font-semibold text-foreground flex items-center gap-1.5">
                    <BookOpen className="size-3.5 text-primary" />
                    Essential Course Prerequisites
                  </h5>
                  <div className="flex flex-wrap gap-1 pt-1">
                    {activeLearningPath.prerequisites.map((p, i) => (
                      <Badge key={i} variant="outline" className="text-[10px]">
                        {p}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {activeLearningPath.commonPitfalls.length > 0 && (
                <div className="rounded-lg bg-destructive/5 border border-destructive/20 p-3 text-xs space-y-1">
                  <h5 className="font-semibold text-destructive flex items-center gap-1.5">
                    <AlertCircle className="size-3.5 text-destructive" />
                    Common Student Pitfalls & Cognitive Bottlenecks
                  </h5>
                  <div className="flex flex-wrap gap-1 pt-1">
                    {activeLearningPath.commonPitfalls.map((p, i) => (
                      <Badge key={i} variant="destructive" className="text-[10px]">
                        {p}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Active Pedagogical Concept Breakdown */}
      {activeAnalysis && (
        <Card className="border-primary/40 bg-card shadow-sm">
          <CardHeader className="border-b border-border pb-4 bg-muted/10">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="text-xs">
                    Pedagogical Syllabus Analysis
                  </Badge>
                  <Badge variant="outline" className="text-xs font-mono">
                    {activeAnalysis.subject || 'Academic Course'}
                  </Badge>
                </div>
                <CardTitle className="text-lg font-bold mt-1">
                  {activeAnalysis.title || `${activeAnalysis.topic} — Concept Breakdown`}
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Extracted from <strong className="text-foreground">{activeAnalysis.sourceDoc || 'Uploaded Document'}</strong>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Link href="/teacher/lesson-plans">
                  <Button size="xs" variant="outline" className="gap-1 text-xs">
                    Create Lesson Plan
                    <ArrowRight className="size-3" />
                  </Button>
                </Link>
                <Link href="/teacher/adaptive">
                  <Button size="xs" className="gap-1 text-xs">
                    Generate Adaptive Tracks
                    <ArrowRight className="size-3" />
                  </Button>
                </Link>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {/* Core Concepts */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Target className="size-3.5 text-primary" />
                  1. Core Pedagogical Concepts
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {activeAnalysis.detectedConcepts.map((c, i) => (
                    <Badge key={i} variant="default" className="text-xs">
                      {c}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Prerequisites & Misconceptions */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <AlertCircle className="size-3.5 text-warning-foreground" />
                  2. Prerequisites & Misconceptions
                </h4>
                <div className="space-y-1.5 text-xs text-muted-foreground">
                  <div>
                    <span className="font-semibold text-foreground">Prerequisites:</span>{' '}
                    {activeAnalysis.prerequisites.join(', ')}
                  </div>
                  <div>
                    <span className="font-semibold text-destructive">Common Pitfalls:</span>{' '}
                    {activeAnalysis.commonMisconceptions.join('; ')}
                  </div>
                </div>
              </div>

              {/* Expected Learning Outcomes */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <CheckCircle2 className="size-3.5 text-success" />
                  3. Expected Learning Outcomes
                </h4>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {activeAnalysis.learningOutcomes.map((lo, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-success font-bold">•</span>
                      <span>{lo}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Materials Library Filter and List */}
      <div className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search materials by title, subject, or topic…"
              className="h-9 w-full rounded-lg border border-input bg-card pl-9 pr-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Type:</span>
            {['All', 'PDF', 'Slides', 'Document', 'Video'].map((type) => (
              <Button
                key={type}
                variant={selectedType === type ? 'default' : 'outline'}
                size="xs"
                onClick={() => setSelectedType(type)}
                className="text-xs"
              >
                {type}
              </Button>
            ))}
          </div>
        </div>

        {/* Materials Cards */}
        <div className="grid gap-4">
          {filteredMaterials.map((mat) => {
            const typeIcons = {
              PDF: FileText,
              Slides: Layers,
              Document: FileCheck,
              Video: Video,
            }
            const TypeIcon = typeIcons[mat.type] || FileText
            const approval = approvalStatuses[mat.topic] || 'Approved'

            return (
              <Card key={mat.id} className="transition-all hover:border-primary/40 hover:shadow-sm">
                <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3.5">
                    <div className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground">
                      <TypeIcon className="size-5 text-primary" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-foreground">{mat.name}</h3>
                        <Badge variant="outline" className="text-[11px] font-mono">
                          {mat.type}
                        </Badge>
                        <Badge
                          variant={
                            approval === 'Assigned'
                              ? 'success'
                              : approval === 'Pending Review'
                                ? 'warning'
                                : 'default'
                          }
                          className="text-[11px]"
                        >
                          {approval}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {mat.subject} · Topic: <span className="font-medium text-foreground">{mat.topic}</span> · {mat.sizeKb} KB · {mat.date}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3 sm:border-t-0 sm:pt-0">
                    {mat.fileUrl && (
                      <>
                        <a
                          href={mat.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded border border-border bg-card px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-muted"
                        >
                          <Eye className="size-3.5 text-primary" />
                          View PDF
                        </a>
                        <a
                          href={mat.fileUrl}
                          download={mat.name}
                          className="inline-flex items-center gap-1 rounded border border-border bg-card px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-muted"
                        >
                          <Download className="size-3.5 text-primary" />
                          Download
                        </a>
                      </>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        handleRunAnalysis(mat)
                        handleGenerateLearningPath(mat)
                      }}
                      disabled={isAnalyzing || isGeneratingPath}
                      className="text-xs gap-1.5"
                    >
                      <Sparkles className="size-3.5 text-primary" />
                      Analyze & Generate Path
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}
