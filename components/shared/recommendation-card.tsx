'use client'

import { Clock, Info, Play, Sparkles, UserPlus } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LevelBadge, PriorityBadge } from '@/components/shared/badges'
import type { Recommendation } from '@/lib/types'
import { useToast } from '@/components/shared/toast'

export function RecommendationCard({
  rec,
  mode = 'student',
}: {
  rec: Recommendation
  mode?: 'student' | 'teacher'
}) {
  const { toast } = useToast()
  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Sparkles className="size-4.5" />
            </div>
            <div className="space-y-0.5">
              <h3 className="font-medium leading-snug text-pretty">{rec.title}</h3>
              {rec.studentName && mode === 'teacher' && (
                <p className="text-xs text-muted-foreground">For {rec.studentName}</p>
              )}
            </div>
          </div>
          <PriorityBadge priority={rec.priority} />
        </div>

        <div className="flex items-start gap-2 rounded-lg bg-muted/60 p-3 text-sm">
          <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <p className="text-muted-foreground text-pretty">
            <span className="font-medium text-foreground">Why: </span>
            {rec.reason}
          </p>
        </div>

        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Recommended actions
          </p>
          <ol className="space-y-1.5">
            {rec.actions.map((a, i) => (
              <li key={a} className="flex items-start gap-2 text-sm">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-accent text-[11px] font-semibold text-accent-foreground">
                  {i + 1}
                </span>
                {a}
              </li>
            ))}
          </ol>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <div className="flex flex-wrap items-center gap-2">
            <LevelBadge level={rec.difficulty} />
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="size-3.5" />
              {rec.estMinutes} min
            </span>
          </div>
          <Button
            size="sm"
            onClick={() =>
              toast({
                title: mode === 'teacher' ? 'Recommendation assigned' : 'Activity started',
                description:
                  mode === 'teacher'
                    ? `Assigned "${rec.title}"${rec.studentName ? ` to ${rec.studentName}` : ''}.`
                    : `Starting "${rec.title}".`,
              })
            }
          >
            {mode === 'teacher' ? <UserPlus /> : <Play />}
            {mode === 'teacher' ? 'Assign' : 'Start'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
