import * as React from 'react'
import { cn } from '@/lib/utils'

function initials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function Avatar({
  name,
  className,
  ...props
}: React.ComponentProps<'div'> & { name: string }) {
  return (
    <div
      className={cn(
        'flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground',
        className,
      )}
      {...props}
    >
      {initials(name)}
    </div>
  )
}

export { Avatar }
