import * as React from 'react'
import type { LucideIcon } from 'lucide-react'
import { AlertCircle, CheckCircle2, Loader2, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-muted/70', className)}
      {...props}
    />
  )
}

export function AILoading({
  label = 'AI is processing…',
  steps,
  currentStepIndex = 0,
  className,
}: {
  label?: string
  steps?: string[]
  currentStepIndex?: number
  className?: string
}) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border border-primary/25 bg-card p-8 text-center shadow-md',
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-chart-2 to-primary animate-pulse" />
      <div className="flex flex-col items-center justify-center gap-4">
        <div className="relative">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-inner">
            <Sparkles className="size-7 animate-spin [animation-duration:3s]" />
          </div>
          <span className="absolute -inset-1 animate-ping rounded-2xl border border-primary/30" />
        </div>
        <div className="space-y-1">
          <h3 className="font-display text-base font-bold text-foreground">{label}</h3>
          <p className="text-xs text-muted-foreground">
            Leveraging Google Gemini to generate pedagogical content
          </p>
        </div>

        {steps && steps.length > 0 && (
          <div className="mt-4 w-full max-w-md rounded-xl border border-border/80 bg-muted/30 p-4 text-left">
            <ul className="space-y-2.5 text-xs">
              {steps.map((step, idx) => {
                const isDone = idx < currentStepIndex
                const isCurrent = idx === currentStepIndex
                return (
                  <li
                    key={idx}
                    className={cn(
                      'flex items-center gap-2.5 transition-colors',
                      isDone && 'text-success font-medium',
                      isCurrent && 'text-primary font-semibold',
                      !isDone && !isCurrent && 'text-muted-foreground/70',
                    )}
                  >
                    {isDone ? (
                      <CheckCircle2 className="size-4 shrink-0 text-success" />
                    ) : isCurrent ? (
                      <Loader2 className="size-4 shrink-0 animate-spin text-primary" />
                    ) : (
                      <span className="size-2 rounded-full bg-muted-foreground/30 ml-1 mr-1" />
                    )}
                    <span className="truncate">{step}</span>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3.5 rounded-2xl border border-dashed border-border/80 bg-card/60 px-6 py-14 text-center',
        className,
      )}
    >
      <div className="flex size-14 items-center justify-center rounded-2xl bg-muted/80 text-muted-foreground shadow-xs">
        <Icon className="size-7" />
      </div>
      <div className="space-y-1 max-w-sm">
        <h4 className="font-display text-sm font-bold text-foreground">{title}</h4>
        {description && (
          <p className="text-xs leading-relaxed text-muted-foreground text-pretty">
            {description}
          </p>
        )}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

export function ErrorState({
  title = 'Something went wrong',
  description = 'We could not complete that request. Please verify your connection or try again.',
  action,
  className,
}: {
  title?: string
  description?: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/[0.04] p-8 text-center',
        className,
      )}
    >
      <div className="flex size-12 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
        <AlertCircle className="size-6" />
      </div>
      <div className="space-y-1 max-w-md">
        <h4 className="font-semibold text-destructive text-sm">{title}</h4>
        <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

export function SavingBadge({ isSaving, isSaved }: { isSaving: boolean; isSaved?: boolean }) {
  if (isSaving) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
        <Loader2 className="size-3 animate-spin text-primary" />
        Saving changes…
      </span>
    )
  }
  if (isSaved) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-success font-medium animate-in fade-in">
        <CheckCircle2 className="size-3" />
        All changes saved
      </span>
    )
  }
  return null
}
