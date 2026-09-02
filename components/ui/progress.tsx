import * as React from 'react'
import { cn } from '@/lib/utils'

type ProgressTone = 'primary' | 'success' | 'warning' | 'destructive'

const toneMap: Record<ProgressTone, string> = {
  primary: 'bg-primary',
  success: 'bg-success',
  warning: 'bg-warning',
  destructive: 'bg-destructive',
}

function Progress({
  value = 0,
  tone = 'primary',
  className,
  ...props
}: React.ComponentProps<'div'> & { value?: number; tone?: ProgressTone }) {
  const clamped = Math.max(0, Math.min(100, value))
  return (
    <div
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn('h-2 w-full overflow-hidden rounded-full bg-muted', className)}
      {...props}
    >
      <div
        className={cn('h-full rounded-full transition-all duration-500', toneMap[tone])}
        style={{ width: `${clamped}%` }}
      />
    </div>
  )
}

export { Progress }
export type { ProgressTone }
