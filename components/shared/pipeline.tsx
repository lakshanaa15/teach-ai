import { ArrowRight } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Pipeline({
  steps,
  className,
}: {
  steps: { label: string; icon: LucideIcon }[]
  className?: string
}) {
  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {steps.map((step, i) => (
        <div key={step.label} className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 shadow-sm">
            <step.icon className="size-4 text-primary" />
            <span className="text-sm font-medium">{step.label}</span>
          </div>
          {i < steps.length - 1 && <ArrowRight className="size-4 shrink-0 text-muted-foreground" />}
        </div>
      ))}
    </div>
  )
}
