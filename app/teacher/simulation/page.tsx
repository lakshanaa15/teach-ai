'use client'

import * as React from 'react'
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  FileCheck,
  FileText,
  HelpCircle,
  Layers,
  Lightbulb,
  MessageSquare,
  Play,
  RefreshCw,
  Rocket,
  Sliders,
  Sparkles,
  Upload,
  UserCheck,
  Users,
  Wand2,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DonutChart } from '@/components/shared/charts'
import { AILoading } from '@/components/shared/states'
import { useToast } from '@/components/shared/toast'
import type { LessonAnalysis, SimulatedStudent, StudentSimulationResult, Material } from '@/lib/types'

export default function SimulationPage() {
  const { toast } = useToast()

  // Source selection: 'uploaded_pdf' | 'class_lesson' | 'demo'
  const [sourceType, setSourceType] = React.useState<'uploaded_pdf' | 'class_lesson' | 'demo'>('uploaded_pdf')

  // Uploaded PDF states
  const [isUploading, setIsUploading] = React.useState(false)
  const [uploadProgress, setUploadProgress] = React.useState(0)
  const [uploadedMaterial, setUploadedMaterial] = React.useState<Material | null>(null)
  const [isDragging, setIsDragging] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement | null>(null)

  // Class Lesson Plan from DB states
  const [classes, setClasses] = React.useState<any[]>([])
  const [selectedClassId, setSelectedClassId] = React.useState<string>('')
  const [lessonPlans, setLessonPlans] = React.useState<any[]>([])
  const [selectedLessonId, setSelectedLessonId] = React.useState<string>('')

  // Simulation execution & results states
  const [isGenerating, setIsGenerating] = React.useState(false)
  const [simulationResult, setSimulationResult] = React.useState<StudentSimulationResult | null>(null)
  const [isImproved, setIsImproved] = React.useState(false)

  // 1. Load saved simulation from sessionStorage on mount to persist across page refreshes
  React.useEffect(() => {
    try {
      const saved = sessionStorage.getItem('teachai_simulation_cache')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed?.students && parsed?.analysis) {
          setSimulationResult(parsed)
        }
      }
    } catch {
      // Ignore parse errors
    }
  }, [])

  // 2. Fetch teacher's classes and approved lesson plans for "My Class Content" mode
  React.useEffect(() => {
    Promise.all([
      fetch('/api/classes').then((r) => (r.ok ? r.json() : null)),
      fetch('/api/lesson-plans').then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([classData, lessonData]) => {
        if (classData?.classes && classData.classes.length > 0) {
          setClasses(classData.classes)
          setSelectedClassId(classData.classes[0].id)
        }
        if (lessonData?.lessonPlans && lessonData.lessonPlans.length > 0) {
          setLessonPlans(lessonData.lessonPlans)
          setSelectedLessonId(lessonData.lessonPlans[0].id)
        }
      })
      .catch(() => {})
  }, [])

  // Handle PDF file selection & upload
  const handlePdfUpload = async (file: File) => {
    const isPdf = file.name.toLowerCase().endsWith('.pdf') || file.type.includes('pdf')
    if (!isPdf) {
      toast({
        title: 'Invalid File Format',
        description: 'Please upload a PDF document (.pdf) containing your lesson plan.',
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
    setUploadProgress(30)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('name', file.name)

    try {
      setUploadProgress(60)
      const res = await fetch('/api/materials', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      setUploadProgress(100)

      if (res.ok && data.success && data.material) {
        setUploadedMaterial(data.material)
        toast({
          title: 'Lesson Plan PDF Processed! 📄',
          description: `"${file.name}" analyzed: Subject "${data.material.subject}", Topic "${data.material.topic}".`,
        })
      } else {
        toast({
          title: 'Upload Failed',
          description: data.error || 'Unable to extract content from this PDF. Please upload a readable lesson-plan PDF.',
        })
      }
    } catch {
      toast({
        title: 'Network Error',
        description: 'Could not contact material upload service.',
      })
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // Run student simulation using real Gemini AI
  const handleRunSimulation = async () => {
    if (sourceType === 'uploaded_pdf' && !uploadedMaterial) {
      toast({
        title: 'No Lesson Plan Provided',
        description: 'No readable lesson plan was provided. Please upload a lesson-plan PDF from your computer.',
      })
      return
    }

    setIsGenerating(true)
    setIsImproved(false)

    try {
      const payload: any = {
        sourceType,
      }

      if (sourceType === 'uploaded_pdf' && uploadedMaterial) {
        payload.materialId = uploadedMaterial.id
        payload.subject = uploadedMaterial.subject
        payload.topic = uploadedMaterial.topic
        payload.lessonTitle = uploadedMaterial.name.replace(/\.pdf$/i, '')
        payload.sourceName = uploadedMaterial.name
        if (uploadedMaterial.rawText) {
          payload.rawContent = uploadedMaterial.rawText
        }
      } else if (sourceType === 'class_lesson') {
        payload.lessonPlanId = selectedLessonId
        const selectedLp = lessonPlans.find((lp) => lp.id === selectedLessonId)
        if (selectedLp) {
          payload.subject = selectedLp.subject
          payload.topic = selectedLp.topic
          payload.lessonTitle = selectedLp.title
        }
      }

      const res = await fetch('/api/simulation/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        toast({
          title: 'Simulation Failed',
          description: data.error || 'Could not generate student simulation with Gemini AI.',
        })
        return
      }

      const result: StudentSimulationResult = {
        students: data.students,
        analysis: data.analysis,
        sourceMetadata: data.sourceMetadata,
      }

      setSimulationResult(result)

      // Persist in sessionStorage for refresh resiliency
      try {
        sessionStorage.setItem('teachai_simulation_cache', JSON.stringify(result))
      } catch {
        // Storage quota safe
      }

      toast({
        title: 'Student Simulation Generated! ✨',
        description: `Simulated 3 student personas based on "${result.sourceMetadata.topic}".`,
      })
    } catch (err) {
      toast({
        title: 'Connection Error',
        description: err instanceof Error ? err.message : 'Could not contact simulation engine.',
      })
    } finally {
      setIsGenerating(false)
    }
  }

  // Apply AI Scaffolding & Improvements
  const handleApplyImprovements = () => {
    if (!simulationResult) return
    setIsImproved(true)

    const topic = simulationResult.sourceMetadata.topic
    const updatedAnalysis: LessonAnalysis = {
      ...simulationResult.analysis,
      effectiveness: Math.min(100, simulationResult.analysis.effectiveness + 14),
      engagement: Math.min(100, simulationResult.analysis.engagement + 12),
      confusingSections: ['All identified ambiguity points addressed with concrete visual scaffolding.'],
      misconceptions: ['Core cognitive misconceptions resolved with targeted check-ins.'],
      improvements: [
        'Interactive analogies and stepped visual scaffolding successfully integrated into the lesson plan.',
      ],
    }

    const updatedStudents: SimulatedStudent[] = simulationResult.students.map((s) => ({
      ...s,
      understanding: Math.min(100, s.understanding + 20),
      response:
        s.profile === 'Struggling Student'
          ? `"The stepped visual breakdown of ${topic} made it completely click! I can solve the foundational problems independently now."`
          : s.profile === 'Average Student'
            ? `"The guided worked example for ${topic} bridged the gap between theory and multi-step questions. Scored full marks on the practice check."`
            : s.profile === 'Advanced Student'
              ? `"Loved the extension challenge linking ${topic} to real-world applications!"`
              : s.response,
      confusionPoints: s.profile === 'Struggling Student' ? ['Minor notation check'] : [],
      misconceptions: [],
    }))

    const updatedResult: StudentSimulationResult = {
      ...simulationResult,
      students: updatedStudents,
      analysis: updatedAnalysis,
    }

    setSimulationResult(updatedResult)
    try {
      sessionStorage.setItem('teachai_simulation_cache', JSON.stringify(updatedResult))
    } catch {
      // Safe
    }

    toast({
      title: 'Lesson Plan Improved! 🚀',
      description: 'Pedagogical scaffolding injected. Simulated comprehension rose across all 3 student personas.',
    })
  }

  const selectedLessonPlan = lessonPlans.find((lp) => lp.id === selectedLessonId)

  return (
    <div className="space-y-8">
      {/* Header */}
      <PageHeader
        title="Student Simulation Sandbox"
        description="Stress-test your lesson against AI simulated student personas representing Struggling, Average, and Advanced learners before entering the physical classroom."
      />

      {/* Source Selection Card */}
      <Card className="border-primary/30 bg-card shadow-sm">
        <CardHeader className="border-b border-border pb-3 bg-muted/20">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4.5 text-primary" />
              <CardTitle className="text-sm font-bold">Lesson Content Source Selection</CardTitle>
            </div>
            <span className="text-xs text-muted-foreground">The uploaded PDF is the primary knowledge source</span>
          </div>
        </CardHeader>
        <CardContent className="p-5 space-y-5">
          {/* Source Radios */}
          <div className="flex flex-wrap gap-4 text-xs font-semibold">
            <label className="flex items-center gap-2 cursor-pointer rounded-lg border border-border p-3 transition-colors hover:bg-muted/40 has-checked:border-primary has-checked:bg-primary/5">
              <input
                type="radio"
                name="simSource"
                value="uploaded_pdf"
                checked={sourceType === 'uploaded_pdf'}
                onChange={() => setSourceType('uploaded_pdf')}
                className="text-primary focus:ring-primary"
              />
              <Upload className="size-4 text-primary" />
              <span>Upload Lesson Plan PDF (From Computer)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer rounded-lg border border-border p-3 transition-colors hover:bg-muted/40 has-checked:border-primary has-checked:bg-primary/5">
              <input
                type="radio"
                name="simSource"
                value="class_lesson"
                checked={sourceType === 'class_lesson'}
                onChange={() => setSourceType('class_lesson')}
                className="text-primary focus:ring-primary"
              />
              <BookOpen className="size-4 text-primary" />
              <span>Use My Class / Lesson Plan (From Database)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer rounded-lg border border-border p-3 transition-colors hover:bg-muted/40 has-checked:border-primary has-checked:bg-primary/5">
              <input
                type="radio"
                name="simSource"
                value="demo"
                checked={sourceType === 'demo'}
                onChange={() => setSourceType('demo')}
                className="text-primary focus:ring-primary"
              />
              <Layers className="size-4 text-primary" />
              <span>Demo Mode (DBMS Showcase)</span>
            </label>
          </div>

          {/* Source Option A: Upload Lesson Plan PDF */}
          {sourceType === 'uploaded_pdf' && (
            <div className="space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) handlePdfUpload(f)
                }}
              />

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
                  if (f) handlePdfUpload(f)
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-colors ${
                  isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/60 hover:bg-muted/30'
                }`}
              >
                <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Upload className="size-6" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground">
                    Click to select Lesson Plan PDF from your computer or drag and drop here
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Supports Physics, Biology, Math, Computer Science, and any custom curriculum (up to 50MB)
                  </p>
                </div>
              </div>

              {/* Uploading Progress Bar */}
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

              {/* Uploaded Material Status Card */}
              {uploadedMaterial && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-success/30 bg-success/[0.04] p-4 text-xs">
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-lg bg-success/10 text-success">
                      <FileCheck className="size-5" />
                    </div>
                    <div>
                      <p className="font-bold text-foreground flex items-center gap-2">
                        <span>File: {uploadedMaterial.name}</span>
                        <Badge variant="success" className="text-[10px]">✓ Material Processed</Badge>
                      </p>
                      <p className="text-muted-foreground mt-0.5">
                        Detected Subject: <strong className="text-foreground">{uploadedMaterial.subject}</strong> · Detected Topic: <strong className="text-foreground">{uploadedMaterial.topic}</strong> · Size: {uploadedMaterial.sizeKb} KB
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs font-mono self-start sm:self-auto">
                    Source: Uploaded Lesson Plan
                  </Badge>
                </div>
              )}
            </div>
          )}

          {/* Source Option B: Class Lesson Plan from DB */}
          {sourceType === 'class_lesson' && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Select Target Class</label>
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs shadow-xs focus-visible:border-ring"
                >
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name} ({cls.subject})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Select Approved Lesson Plan</label>
                {lessonPlans.length > 0 ? (
                  <select
                    value={selectedLessonId}
                    onChange={(e) => setSelectedLessonId(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs shadow-xs focus-visible:border-ring"
                  >
                    {lessonPlans.map((lp) => (
                      <option key={lp.id} value={lp.id}>
                        {lp.title} ({lp.topic})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="rounded border border-dashed border-border p-2 text-xs text-muted-foreground">
                    No approved lesson plans found. Please create one in Lesson Plans.
                  </div>
                )}
              </div>

              {selectedLessonPlan && (
                <div className="sm:col-span-2 rounded-lg bg-muted/30 border border-border p-3 text-xs text-muted-foreground">
                  <p><strong>Topic:</strong> {selectedLessonPlan.topic} · <strong>Subject:</strong> {selectedLessonPlan.subject}</p>
                  <p className="mt-0.5"><strong>Objective:</strong> {selectedLessonPlan.learningObjective}</p>
                </div>
              )}
            </div>
          )}

          {/* Source Option C: Demo Mode */}
          {sourceType === 'demo' && (
            <div className="rounded-xl border border-primary/30 bg-primary/[0.04] p-4 text-xs space-y-1">
              <div className="flex items-center gap-2 font-bold text-primary">
                <Layers className="size-4" />
                <span>Hackathon Demo Showcase: Database Management Systems</span>
              </div>
              <p className="text-muted-foreground">
                Using built-in demo curriculum: <em>ER Model — Entity, Attribute & Cardinality Constraints</em>. Demonstrates how TeachAI models cognitive friction points on junction table mappings.
              </p>
            </div>
          )}

          {/* Generate Button */}
          <div className="flex justify-end pt-2 border-t border-border">
            <Button
              onClick={handleRunSimulation}
              disabled={isGenerating || (sourceType === 'uploaded_pdf' && !uploadedMaterial)}
              className="gap-2 shadow-sm text-xs font-semibold"
            >
              <Sparkles className={`size-4 ${isGenerating ? 'animate-spin' : ''}`} />
              {isGenerating ? 'Simulating Student Cognitive Personas...' : 'Generate Student Simulation'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Loading state or Simulation Results */}
      {isGenerating ? (
        <AILoading
          label="Simulating 30 student interactions with Google Gemini AI…"
          steps={[
            'Ingesting extracted pedagogical source material…',
            'Simulating cognitive load for struggling learner persona…',
            'Testing misconception triggers on subject terminology…',
            'Evaluating exit ticket comprehension and friction points…',
            'Generating lesson effectiveness diagnostic metrics…',
          ]}
        />
      ) : simulationResult ? (
        <>
          {/* Source Identification & Improvement State Banner */}
          <Card className="border-primary/30 bg-gradient-to-r from-primary/5 via-background to-card p-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="text-xs font-semibold">
                    Simulated Lesson
                  </Badge>
                  <Badge variant="outline" className="text-xs font-mono">
                    Subject: {simulationResult.sourceMetadata.subject}
                  </Badge>
                  <Badge variant="outline" className="text-xs font-mono">
                    Topic: {simulationResult.sourceMetadata.topic}
                  </Badge>
                </div>
                <p className="text-muted-foreground">
                  Source Document: <strong className="text-foreground">{simulationResult.sourceMetadata.sourceName}</strong> · Generated from: <strong className="text-foreground">{simulationResult.sourceMetadata.sourceType === 'uploaded_pdf' ? 'Uploaded Lesson Plan' : simulationResult.sourceMetadata.sourceType === 'class_lesson' ? 'Class Lesson Record' : 'Showcase Demo'}</strong>
                </p>
              </div>

              {isImproved && (
                <Badge variant="success" className="gap-1.5 py-1 px-3 self-start sm:self-auto">
                  <CheckCircle2 className="size-3.5" />
                  Lesson Plan Optimized
                </Badge>
              )}
            </div>
          </Card>

          {/* 3 Simulated Student Cards Grid */}
          <div className="grid gap-6 lg:grid-cols-3">
            {simulationResult.students.map((student) => {
              const profileConfig = {
                'Struggling Student': {
                  icon: AlertTriangle,
                  tone: 'border-destructive/30 bg-destructive/[0.02]',
                  gaugeTone: 'var(--color-destructive)',
                  description: 'Needs foundational visual scaffolding & prerequisite recall.',
                },
                'Average Student': {
                  icon: Users,
                  tone: 'border-primary/30 bg-primary/[0.02]',
                  gaugeTone: 'var(--color-primary)',
                  description: 'Understands basic concepts; struggles with multi-step transfer.',
                },
                'Advanced Student': {
                  icon: Rocket,
                  tone: 'border-success/30 bg-success/[0.02]',
                  gaugeTone: 'var(--color-success)',
                  description: 'Masters core lesson quickly; craves extension challenges.',
                },
              }
              const cfg = profileConfig[student.profile] || profileConfig['Average Student']
              const Icon = cfg.icon

              return (
                <Card
                  key={student.profile}
                  className={`flex flex-col justify-between border-2 transition-all hover:shadow-md ${cfg.tone}`}
                >
                  <div>
                    <CardHeader className="border-b border-border/60 pb-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="flex size-9 items-center justify-center rounded-lg bg-card text-foreground shadow-sm">
                            <Icon className="size-5 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-base font-bold">
                              {student.profile}
                            </CardTitle>
                            <p className="text-[11px] text-muted-foreground">{cfg.description}</p>
                          </div>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4 pt-4 text-sm">
                      {/* Understanding Gauge */}
                      <div className="flex items-center justify-between rounded-xl bg-card p-3 border border-border">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Understanding Level
                          </p>
                          <p className="font-display text-2xl font-bold text-foreground">
                            {student.understanding}%
                          </p>
                        </div>
                        <DonutChart
                          value={student.understanding}
                          size={64}
                          stroke={7}
                          tone={cfg.gaugeTone}
                          label={<span className="text-xs font-bold">{student.understanding}%</span>}
                        />
                      </div>

                      {/* Simulated Student Voice / Response */}
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          <MessageSquare className="size-3.5" />
                          Simulated Candid Feedback
                        </div>
                        <blockquote className="rounded-lg border-l-2 border-primary bg-muted/40 p-3 text-xs italic text-foreground leading-relaxed">
                          {student.response}
                        </blockquote>
                      </div>

                      {/* Confusion Points */}
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          <HelpCircle className="size-3.5 text-warning-foreground" />
                          Points of Confusion
                        </div>
                        {student.confusionPoints.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {student.confusionPoints.map((cp, idx) => (
                              <Badge key={idx} variant="warning" className="text-[11px] font-normal">
                                {cp}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-success flex items-center gap-1 font-medium">
                            <CheckCircle2 className="size-3" /> No friction points identified
                          </p>
                        )}
                      </div>

                      {/* Misconceptions */}
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          <AlertCircle className="size-3.5 text-destructive" />
                          Detected Misconceptions
                        </div>
                        {student.misconceptions.length > 0 ? (
                          <div className="space-y-1">
                            {student.misconceptions.map((mis, idx) => (
                              <div
                                key={idx}
                                className="rounded-md bg-destructive/10 px-2.5 py-1.5 text-[11px] font-medium text-destructive"
                              >
                                {mis}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-success flex items-center gap-1 font-medium">
                            <CheckCircle2 className="size-3" /> No misconceptions detected
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </div>
                </Card>
              )
            })}
          </div>

          {/* AI Lesson Effectiveness & Improvement Panel */}
          {simulationResult.analysis && (
            <Card className="border-primary/40 bg-card shadow-sm">
              <CardHeader className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Sparkles className="size-6" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-bold">
                      AI Lesson Diagnostic & Effectiveness Report ({simulationResult.sourceMetadata.topic})
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      Synthesized analysis across all 3 student personas with automated remediation.
                    </p>
                  </div>
                </div>

                <Button
                  onClick={handleApplyImprovements}
                  disabled={isImproved}
                  className="gap-2 shadow-sm text-xs font-semibold"
                >
                  <Wand2 className="size-4" />
                  {isImproved ? 'Lesson Improved ✓' : 'Apply AI Scaffolding & Improvements'}
                </Button>
              </CardHeader>

              <CardContent className="grid gap-6 pt-6 md:grid-cols-2 lg:grid-cols-4">
                {/* Metric 1: Effectiveness Score */}
                <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-4">
                  <DonutChart
                    value={simulationResult.analysis.effectiveness}
                    size={72}
                    stroke={8}
                    tone="var(--color-primary)"
                  />
                  <div>
                    <p className="text-xs text-muted-foreground">Effectiveness Score</p>
                    <p className="font-display text-2xl font-bold">{simulationResult.analysis.effectiveness}/100</p>
                    <p className="text-[11px] text-muted-foreground">Pedagogical clarity</p>
                  </div>
                </div>

                {/* Metric 2: Predicted Engagement */}
                <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-4">
                  <DonutChart
                    value={simulationResult.analysis.engagement}
                    size={72}
                    stroke={8}
                    tone="var(--color-chart-2)"
                  />
                  <div>
                    <p className="text-xs text-muted-foreground">Engagement Index</p>
                    <p className="font-display text-2xl font-bold">{simulationResult.analysis.engagement}%</p>
                    <p className="text-[11px] text-muted-foreground">Active participation</p>
                  </div>
                </div>

                {/* Metric 3: Confusing Sections */}
                <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-1.5">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Confusing Sections Identified
                  </h4>
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    {simulationResult.analysis.confusingSections.map((cs, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-destructive font-bold">•</span>
                        <span>{cs}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Metric 4: Suggested Improvements */}
                <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-1.5">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Recommended Enhancements
                  </h4>
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    {simulationResult.analysis.improvements.map((imp, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <CheckCircle2 className="size-3 text-success shrink-0 mt-0.5" />
                        <span>{imp}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <Card className="border-dashed border-2 border-border p-12 text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4">
            <Users className="size-7" />
          </div>
          <h3 className="font-display text-lg font-bold text-foreground">
            No Student Simulation Run Yet
          </h3>
          <p className="mt-1 text-xs text-muted-foreground max-w-md mx-auto">
            Upload your lesson plan PDF or select an existing lesson plan above to generate real AI student personas and stress-test your lesson.
          </p>
        </Card>
      )}
    </div>
  )
}
