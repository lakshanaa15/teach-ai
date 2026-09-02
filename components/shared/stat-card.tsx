import type { LucideIcon } from 'lucide-react'
import { TrendingDown, TrendingUp } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  tone = 'primary',
}: {
  label: string
  value: string | number
  icon: LucideIcon
  trend?: { value: string; up: boolean }
  tone?: 'primary' | 'success' | 'warning' | 'destructive'
}) {
  const toneMap = {
    primary: 'bg-primary/10 text-primary',
    success: 'bg-success/12 text-success',
    warning: 'bg-warning/18 text-warning-foreground',
    destructive: 'bg-destructive/12 text-destructive',
  }
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1.5">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="font-display text-3xl font-semibold tracking-tight">{value}</p>
          {trend && (
            <div
              className={cn(
                'flex items-center gap-1 text-xs font-medium',
                trend.up ? 'text-success' : 'text-destructive',
              )}
            >
              {trend.up ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
              {trend.value}
            </div>
          )}
        </div>
        <div className={cn('flex size-10 items-center justify-center rounded-lg', toneMap[tone])}>
          <Icon className="size-5" />
        </div>
      </div>
    </Card>
  )
}
