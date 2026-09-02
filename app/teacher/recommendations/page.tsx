'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Filter,
  Layers,
  Lightbulb,
  Play,
  Rocket,
  Search,
  Send,
  Sparkles,
  UserCheck,
  UserPlus,
  Users,
  Zap,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { RecommendationCard } from '@/components/shared/recommendation-card'
import { useAppSession } from '@/lib/session-context'
import type { Priority, Recommendation } from '@/lib/types'
import { useToast } from '@/components/shared/toast'

export default function RecommendationsPage() {
  const { toast } = useToast()
  const { teacherRecommendations } = useAppSession()

  const [selectedPriority, setSelectedPriority] = React.useState<string>('All')
  const [selectedTopic, setSelectedTopic] = React.useState<string>('All')
  const [search, setSearch] = React.useState('')

  const filteredRecs = teacherRecommendations.filter((rec) => {
    const matchesSearch =
      rec.title.toLowerCase().includes(search.toLowerCase()) ||
      rec.reason.toLowerCase().includes(search.toLowerCase()) ||
      (rec.studentName && rec.studentName.toLowerCase().includes(search.toLowerCase()))
    const matchesPriority = selectedPriority === 'All' || rec.priority === selectedPriority
    const matchesTopic = selectedTopic === 'All' || rec.topic === selectedTopic
    return matchesSearch && matchesPriority && matchesTopic
  })

  const handleAssignAllHighPriority = () => {
    toast({
      title: 'Batch interventions assigned',
      description: `Dispatched targeted remedial tracks to Alex Rivera and class cohort.`,
    })
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <PageHeader
        title="AI Pedagogical Recommendation Engine"
        description="Automated learning gap interventions derived from real-time student quiz diagnostics, cognitive confusion indicators, and mastery retention data."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={handleAssignAllHighPriority}
              className="gap-2 shadow-sm"
            >
              <Send className="size-4" />
              Assign All High Priority
            </Button>
          </div>
        }
      />

      {/* Overview Diagnostic Banner */}
      <Card className="border-primary/30 bg-primary/[0.03] p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4.5 text-primary" />
              <h3 className="font-semibold text-foreground text-sm">
                Active Targeted Intervention Pathways ({teacherRecommendations.length})
              </h3>
            </div>
            <p className="text-xs text-muted-foreground text-pretty">
              Interventions dynamically refresh when students complete formative assessments in the Student Portal.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="destructive" className="text-xs">
              High Priority Focus
            </Badge>
            <Badge variant="outline" className="text-xs font-mono">
              Live Feed
            </Badge>
          </div>
        </div>
      </Card>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search recommendations by student, topic, or reason…"
            className="h-9 w-full rounded-lg border border-input bg-card pl-9 pr-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Priority:</span>
          {['All', 'High', 'Medium', 'Low'].map((p) => (
            <Button
              key={p}
              variant={selectedPriority === p ? 'default' : 'outline'}
              size="xs"
              onClick={() => setSelectedPriority(p)}
              className="text-xs"
            >
              {p}
            </Button>
          ))}
        </div>
      </div>

      {/* Recommendation Cards Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {filteredRecs.map((rec) => (
          <RecommendationCard key={rec.id} rec={rec} mode="teacher" />
        ))}
      </div>
    </div>
  )
}
