import * as React from 'react'
import type { LucideIcon } from 'lucide-react'
import { Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

export function AILoading({
  label = 'AI is processing…',
  steps,
  className,
}: {
  label?: string
  steps?: string[]
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border bg-muted/40 px-6 py-12 text-center',
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <div className="relative">
        <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
          <Sparkles className="size-6 text-primary animate-pulse" />
        </div>
        <span className="absolute inset-0 animate-ping rounded-full border border-primary/30" />
      </div>
      <div>
        <p className="font-medium">{label}</p>
        {steps && (
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            {steps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
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
        'flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border px-6 py-14 text-center',
        className,
      )}
    >
      <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="size-6" />
      </div>
      <div className="space-y-1">
        <p className="font-medium">{title}</p>
        {description && (
          <p className="mx-auto max-w-sm text-sm text-muted-foreground text-pretty">{description}</p>
        )}
      </div>
      {action}
    </div>
  )
}

export function ErrorState({
  title = 'Something went wrong',
  description = 'We could not complete that request. Please try again.',
  action,
}: {
  title?: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-6 py-12 text-center">
      <p className="font-medium text-destructive">{title}</p>
      <p className="mx-auto max-w-sm text-sm text-muted-foreground">{description}</p>
      {action}
    </div>
  )
}
