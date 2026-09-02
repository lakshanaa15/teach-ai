'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  BookOpen,
  Boxes,
  Check,
  CheckCircle2,
  Copy,
  Edit3,
  ExternalLink,
  Eye,
  GraduationCap,
  Layers,
  Lightbulb,
  RefreshCw,
  Rocket,
  Save,
  Send,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Zap,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LevelBadge } from '@/components/shared/badges'
import { Pipeline } from '@/components/shared/pipeline'
import { AILoading } from '@/components/shared/states'
import { useAppSession } from '@/lib/session-context'
import type { AdaptiveTrack, LearningLevel } from '@/lib/types'
import { useToast } from '@/components/shared/toast'

export default function AdaptivePage() {
  const { toast } = useToast()
  const {
    selectedTopic,
    setSelectedTopic,
    getAdaptiveTracksForTopic,
    updateTrackContent,
    approveAndAssignTopic,
    approvalStatuses,
  } = useAppSession()

  const [isLoading, setIsLoading] = React.useState(false)
  const [tracks, setTracks] = React.useState<AdaptiveTrack[]>([])
  const [editingTrack, setEditingTrack] = React.useState<AdaptiveTrack | null>(null)
  const [previewTrack, setPreviewTrack] = React.useState<AdaptiveTrack | null>(null)

  const currentApproval = approvalStatuses[selectedTopic] || 'Pending Review'

  // Load tracks for selected topic
  React.useEffect(() => {
    loadTracks(selectedTopic)
  }, [selectedTopic])

  const loadTracks = async (topic: string) => {
    setIsLoading(true)
    try {
      const generated = await getAdaptiveTracksForTopic(topic)
      setTracks(generated)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveEdit = () => {
    if (!editingTrack) return
    updateTrackContent(selectedTopic, editingTrack.level, editingTrack)
    setTracks((prev) =>
      prev.map((t) => (t.level === editingTrack.level ? editingTrack : t)),
    )
    setEditingTrack(null)
    toast({
      title: 'Track modifications saved',
      description: `Teacher edits to the ${editingTrack.level} track have been applied.`,
    })
  }

  const handleApproveAndAssign = () => {
    approveAndAssignTopic(selectedTopic)
    toast({
      title: 'Approved & Assigned to Class! 🎉',
      description: `All 3 adaptive tracks and formative quiz for "${selectedTopic}" are now live in the Student Portal.`,
    })
  }

  const pipelineSteps = [
    { label: '1. AI Generates', icon: Sparkles },
    { label: '2. Teacher Reviews', icon: Edit3 },
    { label: '3. Teacher Approves', icon: ShieldCheck },
    { label: '4. Students Receive Content', icon: Send },
  ]

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <PageHeader
        title="3-Tier Adaptive Learning Generator & Approval"
        description="Review AI-generated differentiated tracks. Verify and approve pedagogical content before assigning to learners."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedTopic}
              onChange={(e) => setSelectedTopic(e.target.value)}
              className="h-9 rounded-lg border border-input bg-card px-3 text-sm font-semibold outline-none transition-colors focus-visible:border-ring focus-visible:ring-2"
            >
              <option value="ER Model">ER Model — Entity, Attribute, Cardinality</option>
              <option value="Trigonometric Identities">Trigonometric Identities</option>
              <option value="Intro to Calculus">Intro to Calculus</option>
              <option value="Quadratic Functions">Quadratic Functions</option>
            </select>
            <Button
              onClick={() => loadTracks(selectedTopic)}
              disabled={isLoading}
              variant="outline"
              className="gap-2 text-xs"
            >
              <RefreshCw className={`size-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              Regenerate
            </Button>
          </div>
        }
      />

      {/* Human-in-the-Loop Teacher Approval Pipeline Card */}
      <Card className="border-primary/40 bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-5 text-primary" />
              <h3 className="font-semibold text-foreground text-base">
                Teacher Verification & Content Approval
              </h3>
              <Badge
                variant={
                  currentApproval === 'Assigned'
                    ? 'success'
                    : currentApproval === 'Pending Review'
                      ? 'warning'
                      : 'default'
                }
                className="text-xs uppercase"
              >
                {currentApproval}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Review the 3 differentiated levels below. Click <strong>Edit Content</strong> to customize explanations, then click <strong>Approve & Assign</strong> to publish.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Pipeline steps={pipelineSteps} className="hidden xl:flex" />
            <Button
              onClick={handleApproveAndAssign}
              className="gap-2 shadow-md bg-success hover:bg-success/90 text-white"
            >
              <CheckCircle2 className="size-4" />
              {currentApproval === 'Assigned' ? 'Re-Approve & Assign' : 'Approve & Assign to Students'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Loading State or Tracks Display */}
      {isLoading ? (
        <AILoading
          label={`Synthesizing 3 adaptive tracks for ${selectedTopic}…`}
          steps={[
            'Scaffolding physical analogies for Remedial track…',
            'Aligning Standard track with curriculum benchmarks…',
            'Constructing enterprise challenge extensions for Advanced track…',
          ]}
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {tracks.map((track) => {
            const levelConfig = {
              Remedial: {
                badgeVariant: 'warning' as const,
                icon: Layers,
                tone: 'border-warning/30 bg-warning/[0.02]',
                headerTone: 'text-warning-foreground',
                target: 'Scaffolded intuition and concrete visual analogies for struggling learners.',
              },
              Standard: {
                badgeVariant: 'default' as const,
                icon: GraduationCap,
                tone: 'border-primary/30 bg-primary/[0.02]',
                headerTone: 'text-primary',
                target: 'Curriculum-level definitions, standard notation, and mixed practice.',
              },
              Advanced: {
                badgeVariant: 'success' as const,
                icon: Rocket,
                tone: 'border-success/30 bg-success/[0.02]',
                headerTone: 'text-success',
                target: 'Enterprise extensions, formal proofs, and high-complexity challenges.',
              },
            }
            const config = levelConfig[track.level]
            const Icon = config.icon

            return (
              <Card
                key={track.level}
                className={`flex flex-col justify-between border-2 transition-all hover:shadow-md ${config.tone}`}
              >
                <div>
                  <CardHeader className="border-b border-border/60 pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex size-8 items-center justify-center rounded-lg bg-card text-foreground shadow-sm">
                          <Icon className="size-4.5 text-primary" />
                        </div>
                        <CardTitle className="text-lg font-bold">{track.level} Track</CardTitle>
                      </div>
                      <LevelBadge level={track.level} />
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">{config.target}</p>
                  </CardHeader>

                  <CardContent className="space-y-4 pt-4 text-sm">
                    {/* Summary */}
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Core Pedagogical Strategy
                      </h4>
                      <p className="mt-1 text-sm font-medium text-foreground">{track.summary}</p>
                    </div>

                    {/* Key Teaching Points */}
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Scaffolded Concept Sequence
                      </h4>
                      <ul className="mt-1.5 space-y-1.5 text-xs text-muted-foreground">
                        {track.points.map((pt, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-primary" />
                            <span>{pt}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Worked Example */}
                    <div className="rounded-lg border border-border/80 bg-card p-3">
                      <h4 className="text-xs font-semibold text-foreground">
                        Worked Demonstration:
                      </h4>
                      <p className="mt-1 text-xs text-muted-foreground">{track.example}</p>
                    </div>

                    {/* Practice Set */}
                    <div className="rounded-lg border border-border/80 bg-card p-3">
                      <h4 className="text-xs font-semibold text-foreground">
                        Practice Assessment:
                      </h4>
                      <p className="mt-1 text-xs text-muted-foreground">{track.practice}</p>
                    </div>
                  </CardContent>
                </div>

                {/* Card Actions */}
                <div className="flex items-center justify-between border-t border-border/60 p-4">
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => setEditingTrack(track)}
                    className="gap-1.5 text-xs"
                  >
                    <Edit3 className="size-3.5" />
                    Edit Content
                  </Button>

                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => setPreviewTrack(track)}
                      className="gap-1 text-xs"
                    >
                      <Eye className="size-3.5" />
                      Preview
                    </Button>
                    <Link href={`/student/learning?topic=${encodeURIComponent(selectedTopic)}`}>
                      <Button
                        size="xs"
                        variant="secondary"
                        className="gap-1 text-xs"
                      >
                        Student View <ArrowRight className="size-3" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Edit Track Modal */}
      {editingTrack && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-xl shadow-2xl animate-in zoom-in-95">
            <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Edit3 className="size-5 text-primary" />
                <CardTitle className="text-lg font-bold">
                  Teacher Review: Edit {editingTrack.level} Track
                </CardTitle>
              </div>
              <Button variant="ghost" size="icon-sm" onClick={() => setEditingTrack(null)}>
                ✕
              </Button>
            </CardHeader>
            <CardContent className="space-y-4 pt-4 text-sm">
              <div>
                <label className="text-xs font-semibold uppercase text-muted-foreground">
                  Track Summary / Strategy
                </label>
                <textarea
                  value={editingTrack.summary}
                  onChange={(e) =>
                    setEditingTrack({ ...editingTrack, summary: e.target.value })
                  }
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-input bg-card p-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-2"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase text-muted-foreground">
                  Worked Demonstration Model
                </label>
                <textarea
                  value={editingTrack.example}
                  onChange={(e) =>
                    setEditingTrack({ ...editingTrack, example: e.target.value })
                  }
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-input bg-card p-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-2"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase text-muted-foreground">
                  Practice Assessment Structure
                </label>
                <input
                  type="text"
                  value={editingTrack.practice}
                  onChange={(e) =>
                    setEditingTrack({ ...editingTrack, practice: e.target.value })
                  }
                  className="mt-1 h-9 w-full rounded-lg border border-input bg-card px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2"
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-border pt-4">
                <Button variant="outline" size="sm" onClick={() => setEditingTrack(null)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSaveEdit} className="gap-1.5">
                  <Save className="size-4" />
                  Save Edits
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Student View Preview Modal */}
      {previewTrack && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95">
            <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-3 bg-muted/30">
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="text-xs">
                    Live Student View Simulation
                  </Badge>
                  <LevelBadge level={previewTrack.level} />
                </div>
                <CardTitle className="mt-1 text-base font-bold">
                  {selectedTopic} — {previewTrack.level} Track
                </CardTitle>
              </div>
              <Button variant="ghost" size="icon-sm" onClick={() => setPreviewTrack(null)}>
                ✕
              </Button>
            </CardHeader>
            <CardContent className="space-y-4 pt-4 text-sm leading-relaxed">
              <div className="rounded-lg bg-primary/5 p-4 border border-primary/20">
                <h4 className="font-semibold text-primary">Lesson Overview</h4>
                <p className="mt-1 text-sm text-foreground">{previewTrack.summary}</p>
              </div>

              <div>
                <h4 className="font-semibold text-foreground">Step-by-Step Concepts:</h4>
                <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm text-muted-foreground">
                  {previewTrack.points.map((pt, i) => (
                    <li key={i}>{pt}</li>
                  ))}
                </ol>
              </div>

              <div className="rounded-lg border border-border bg-card p-4">
                <h4 className="font-semibold text-foreground">Guided Demonstration</h4>
                <p className="mt-1 text-sm text-muted-foreground">{previewTrack.example}</p>
              </div>

              <div className="rounded-lg border border-border bg-card p-4">
                <h4 className="font-semibold text-foreground">Interactive Practice</h4>
                <p className="mt-1 text-sm text-muted-foreground">{previewTrack.practice}</p>
              </div>

              <div className="flex justify-end gap-2 border-t border-border pt-4">
                <Button variant="outline" size="sm" onClick={() => setPreviewTrack(null)}>
                  Close Preview
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
