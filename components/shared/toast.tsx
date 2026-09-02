'use client'

import * as React from 'react'
import { CheckCircle2, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type Toast = { id: number; title: string; description?: string }
type ToastContextValue = { toast: (t: Omit<Toast, 'id'>) => void }

const ToastContext = React.createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([])

  const toast = React.useCallback((t: Omit<Toast, 'id'>) => {
    const id = Date.now() + Math.random()
    setToasts((prev) => [...prev, { ...t, id }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id))
    }, 3800)
  }, [])

  const dismiss = (id: number) => setToasts((prev) => prev.filter((x) => x.id !== id))

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-full max-w-sm flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              'pointer-events-auto flex items-start gap-3 rounded-lg border border-border bg-card p-4 shadow-lg',
              'animate-in slide-in-from-bottom-2 fade-in',
            )}
            role="status"
          >
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" />
            <div className="flex-1 space-y-0.5">
              <p className="text-sm font-medium">{t.title}</p>
              {t.description && (
                <p className="text-sm text-muted-foreground text-pretty">{t.description}</p>
              )}
            </div>
            <button
              onClick={() => dismiss(t.id)}
              className="text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Dismiss notification"
            >
              <X className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = React.useContext(ToastContext)
  if (!ctx) return { toast: () => {} }
  return ctx
}
