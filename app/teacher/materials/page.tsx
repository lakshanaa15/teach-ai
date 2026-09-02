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
  ExternalLink,
  FileCheck,
  FileCheck2,
  FileText,
  Filter,
  Layers,
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
import type { Material, MaterialAnalysis } from '@/lib/types'
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

  const [search, setSearch] = React.useState('')
  const [selectedType, setSelectedType] = React.useState<string>('All')
  const [selectedTopicFilter, setSelectedTopicFilter] = React.useState<string>('All')
  const [isUploading, setIsUploading] = React.useState(false)
  const [uploadProgress, setUploadProgress] = React.useState(0)
  const [isAnalyzing, setIsAnalyzing] = React.useState(false)
  const [activeAnalysis, setActiveAnalysis] = React.useState<MaterialAnalysis | null>(null)
  const [isDragging, setIsDragging] = React.useState(false)

  const filteredMaterials = materials.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.topic.toLowerCase().includes(search.toLowerCase()) ||
      m.subject.toLowerCase().includes(search.toLowerCase())
    const matchesType = selectedType === 'All' || m.type === selectedType
    const matchesTopic = selectedTopicFilter === 'All' || m.topic === selectedTopicFilter
    return matchesSearch && matchesType && matchesTopic
  })

  const handleSimulateUpload = async (
    fileName = 'DBMS_ER_Model_Lecture_Notes.pdf',
    subject = 'Database Management Systems',
    topic = 'ER Model',
    type: Material['type'] = 'PDF',
  ) => {
    setIsUploading(true)
    setUploadProgress(20)
    const interval = setInterval(async () => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval)
          setTimeout(async () => {
            const newMat = await uploadMaterial({
              name: fileName,
              subject,
              topic,
              type,
            })
            setIsUploading(false)
            setUploadProgress(0)
            toast({
              title: 'Upload complete',
              description: `"${newMat.name}" indexed and ready for AI analysis.`,
            })
            // Automatically trigger analysis for seamless demo
            handleRunAnalysis(newMat)
          }, 300)
          return 100
        }
        return prev + 25
      })
    }, 200)
  }

  const handleRunAnalysis = async (mat: Material) => {
    setIsAnalyzing(true)
    setSelectedTopic(mat.topic)
    try {
      const res = await analyzeTopic(mat.topic, mat.name)
      setActiveAnalysis(res)
      toast({
        title: 'AI Analysis Complete',
        description: `Extracted ${res.detectedConcepts.length} concepts and identified common student misconceptions.`,
      })
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <PageHeader
        title="Learning Materials & AI Concept Extraction"
        description="Upload textbooks, lecture slide decks, and lesson notes. TeachAI parses the pedagogical structure, extracts key concepts, diagnoses misconceptions, and generates multi-level adaptive tracks."
        actions={
          <Button
            onClick={() =>
              handleSimulateUpload(
                'ER_Model_Complete_Lecture_Slides.pptx',
                'Database Management Systems',
                'ER Model',
                'Slides',
              )
            }
            className="gap-2 shadow-sm"
          >
            <Upload className="size-4" />
            Upload New Material
          </Button>
        }
      />

      {/* Featured Hackathon Demo Banner */}
      <Card className="border-primary/40 bg-gradient-to-r from-primary/10 via-card to-chart-2/10 p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="default" className="text-xs">
                Featured Hackathon Demo Topic
              </Badge>
              <Badge variant="outline" className="text-xs font-mono">
                DBMS
              </Badge>
            </div>
            <h3 className="text-base font-bold text-foreground">
              ER Model — Entity, Attribute, Relationship, Cardinality
            </h3>
            <p className="text-xs text-muted-foreground text-pretty max-w-2xl">
              Demonstrates automatic concept extraction, difficulty classification, 3-tier adaptive generation, teacher approval, and student learning.
            </p>
          </div>
          <Button
            onClick={() => {
              const mat = materials.find((m) => m.topic === 'ER Model') || materials[0]
              handleRunAnalysis(mat)
            }}
            disabled={isAnalyzing}
            className="gap-2 shadow-sm shrink-0"
          >
            <Sparkles className={`size-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
            Analyze with AI
          </Button>
        </div>
      </Card>

      {/* Drag and Drop Upload Area */}
      <Card
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setIsDragging(false)
          handleSimulateUpload()
        }}
        className={`border-2 border-dashed transition-colors ${
          isDragging ? 'border-primary bg-primary/5' : 'border-border bg-card'
        }`}
      >
        <CardContent className="flex flex-col items-center justify-center p-8 text-center sm:p-10">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Upload className="size-7" />
          </div>
          <h3 className="mt-4 font-display text-lg font-semibold">
            {isUploading ? 'Processing with TeachAI Engine…' : 'Drop lesson files or click to upload'}
          </h3>
          <p className="mt-1 max-w-md text-xs text-muted-foreground">
            Supports PDF, PowerPoint (PPTX), Word (DOCX), Markdown, and video lecture notes up to 100MB.
          </p>

          {isUploading ? (
            <div className="mt-6 w-full max-w-xs space-y-2">
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground font-mono">{uploadProgress}% complete</p>
            </div>
          ) : (
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  handleSimulateUpload(
                    'ER_Model_DBMS_Lecture.pdf',
                    'Database Management Systems',
                    'ER Model',
                    'PDF',
                  )
                }
              >
                Upload DBMS ER Model (PDF)
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  handleSimulateUpload(
                    'Trig_Identities_Lecture.pptx',
                    'Mathematics',
                    'Trigonometric Identities',
                    'Slides',
                  )
                }
              >
                Upload Math Trig (Slides)
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Search and Filters */}
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

      {/* Materials Library Table / Cards */}
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

                {/* Pedagogical Actions */}
                <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3 sm:border-t-0 sm:pt-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRunAnalysis(mat)}
                    disabled={isAnalyzing}
                    className="text-xs gap-1.5"
                  >
                    <Sparkles className="size-3.5 text-primary" />
                    Analyze with AI
                  </Button>

                  <Link href={`/teacher/adaptive?topic=${encodeURIComponent(mat.topic)}`}>
                    <Button variant="outline" size="sm" className="text-xs gap-1">
                      <Boxes className="size-3.5 text-success" />
                      Adaptive Tracks
                    </Button>
                  </Link>

                  <Link href={`/teacher/simulation?topic=${encodeURIComponent(mat.topic)}`}>
                    <Button variant="outline" size="sm" className="text-xs gap-1">
                      <Sparkles className="size-3.5 text-chart-2" />
                      Simulation
                    </Button>
                  </Link>

                  <Link href={`/teacher/quizzes?topic=${encodeURIComponent(mat.topic)}`}>
                    <Button size="sm" className="text-xs gap-1">
                      <Zap className="size-3.5" />
                      Quiz
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* AI Concept Extraction & Pedagogical Analysis Modal */}
      {activeAnalysis && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-3xl max-h-[88vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 flex flex-col">
            <CardHeader className="flex flex-row items-start justify-between border-b border-border pb-4 bg-muted/20">
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="text-xs">
                    AI Pedagogical Diagnostic
                  </Badge>
                  <LevelBadge level={activeAnalysis.difficulty} />
                  <span className="text-xs text-muted-foreground">{activeAnalysis.subject}</span>
                </div>
                <CardTitle className="mt-1 text-xl font-bold">{activeAnalysis.topic}</CardTitle>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setActiveAnalysis(null)}
              >
                ✕
              </Button>
            </CardHeader>

            <CardContent className="space-y-6 pt-6 text-sm">
              {/* 1. Detected Concepts */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Target className="size-4 text-primary" />
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    1. Detected Core Concepts ({activeAnalysis.detectedConcepts.length})
                  </h4>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {activeAnalysis.detectedConcepts.map((concept, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 rounded-lg border border-border bg-card p-2.5 text-xs font-medium text-foreground"
                    >
                      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                        {idx + 1}
                      </span>
                      <span>{concept}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 2. Prerequisites & Common Misconceptions Grid */}
              <div className="grid gap-6 sm:grid-cols-2">
                {/* Prerequisites */}
                <div className="space-y-2 rounded-xl border border-border bg-muted/20 p-4">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Prerequisites Identified
                  </h4>
                  <ul className="space-y-1.5 text-xs text-muted-foreground">
                    {activeAnalysis.prerequisites.map((prereq, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle2 className="size-3.5 text-success shrink-0 mt-0.5" />
                        <span>{prereq}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Misconceptions */}
                <div className="space-y-2 rounded-xl border border-destructive/30 bg-destructive/[0.03] p-4">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-destructive">
                    Common Student Misconceptions
                  </h4>
                  <ul className="space-y-1.5 text-xs text-muted-foreground">
                    {activeAnalysis.commonMisconceptions.map((misc, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="font-bold text-destructive">•</span>
                        <span>{misc}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* 3. Expected Learning Outcomes */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Expected Learning Outcomes
                </h4>
                <div className="space-y-1.5">
                  {activeAnalysis.learningOutcomes.map((lo, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2 text-xs text-muted-foreground"
                    >
                      <Check className="size-3.5 text-primary shrink-0 mt-0.5" />
                      <span>{lo}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons: Next step in the workflow */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                <Button variant="outline" size="sm" onClick={() => setActiveAnalysis(null)}>
                  Close Analysis
                </Button>
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/teacher/simulation?topic=${encodeURIComponent(activeAnalysis.topic)}`}>
                    <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                      <Sparkles className="size-3.5 text-chart-2" />
                      Simulate Learners
                    </Button>
                  </Link>
                  <Link href={`/teacher/adaptive?topic=${encodeURIComponent(activeAnalysis.topic)}`}>
                    <Button size="sm" className="gap-1.5 shadow-sm">
                      <Boxes className="size-4" />
                      Generate Adaptive Tracks
                      <ArrowRight className="size-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* AI Resource Matcher */}
      <div className="mt-12 space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4.5 text-primary" />
              <h2 className="font-display text-lg font-bold">AI Resource Matcher</h2>
            </div>
            <p className="text-xs text-muted-foreground">
              Automatically paired videos, articles, interactive diagrams, and practice sets mapped to curriculum standards.
            </p>
          </div>
          <Badge variant="outline" className="text-xs">
            Topic: ER Model & Cardinality
          </Badge>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {resources.map((res) => (
            <Card key={res.id} className="flex flex-col justify-between p-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-[10px]">
                    {res.type}
                  </Badge>
                  <LevelBadge level={res.difficulty} />
                </div>
                <h4 className="text-sm font-semibold text-foreground">{res.title}</h4>
                <p className="text-xs text-muted-foreground">{res.reason}</p>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="size-3" />
                  {res.estMinutes} min
                </span>
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() =>
                    toast({
                      title: 'Resource attached to lesson',
                      description: `"${res.title}" will be accessible in student portal.`,
                    })
                  }
                  className="gap-1 text-xs text-primary"
                >
                  <Plus className="size-3" />
                  Attach to Lesson
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
