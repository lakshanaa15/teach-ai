'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  Flame,
  GraduationCap,
  Lightbulb,
  Play,
  Rocket,
  Sparkles,
  Zap,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { RecommendationCard } from '@/components/shared/recommendation-card'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAppSession } from '@/lib/session-context'

export default function StudentRecommendationsPage() {
  const { studentRecommendations, selectedTopic } = useAppSession()

  return (
    <div className="space-y-8">
      {/* Header */}
      <PageHeader
        title="Personalized Learning Recommendations"
        description="Dynamic study actions generated based on your recent quiz performances, detected concept gaps, and current mastery goals."
        actions={
          <div className="flex items-center gap-2">
            <Link href={`/student/learning?topic=${encodeURIComponent(selectedTopic)}`}>
              <Button size="sm" className="gap-1.5 shadow-sm">
                <BookOpen className="size-4" />
                Adaptive Track
              </Button>
            </Link>
          </div>
        }
      />

      {/* Rationale Banner */}
      <Card className="border-primary/30 bg-primary/[0.03] p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4.5 text-primary" />
              <h3 className="font-semibold text-foreground text-sm">
                Why are these actions recommended?
              </h3>
            </div>
            <p className="text-xs text-muted-foreground text-pretty">
              TeachAI continuously diagnoses your assessment answers to pinpoint exact concept hurdles. Completing these targeted micro-actions will increase your mastery score to 85%+.
            </p>
          </div>
          <Badge variant="outline" className="text-xs font-mono shrink-0">
            {studentRecommendations.length} actions active
          </Badge>
        </div>
      </Card>

      {/* Recommendations Cards Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {studentRecommendations.map((rec) => (
          <RecommendationCard key={rec.id} rec={rec} mode="student" />
        ))}
      </div>
    </div>
  )
}
