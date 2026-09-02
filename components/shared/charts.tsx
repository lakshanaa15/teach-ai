'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

/* ---------------------------------- Line ---------------------------------- */

export function LineChart({
  data,
  labels,
  className,
  height = 200,
  tone = 'var(--color-chart-1)',
  showArea = true,
}: {
  data: number[]
  labels?: string[]
  className?: string
  height?: number
  tone?: string
  showArea?: boolean
}) {
  const width = 600
  const pad = 24
  const max = Math.max(...data, 100)
  const min = Math.min(...data, 0)
  const range = max - min || 1
  const stepX = (width - pad * 2) / Math.max(data.length - 1, 1)

  const points = data.map((v, i) => {
    const x = pad + i * stepX
    const y = pad + (1 - (v - min) / range) * (height - pad * 2)
    return [x, y] as const
  })

  const linePath = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x} ${y}`).join(' ')
  const areaPath =
    `${linePath} L ${points[points.length - 1][0]} ${height - pad} L ${points[0][0]} ${height - pad} Z`
  const gid = React.useId()

  return (
    <div className={cn('w-full', className)}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        style={{ height }}
        preserveAspectRatio="none"
        role="img"
        aria-label="Line chart"
      >
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={tone} stopOpacity="0.22" />
            <stop offset="100%" stopColor={tone} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <line
            key={t}
            x1={pad}
            x2={width - pad}
            y1={pad + t * (height - pad * 2)}
            y2={pad + t * (height - pad * 2)}
            stroke="var(--color-border)"
            strokeWidth="1"
          />
        ))}
        {showArea && <path d={areaPath} fill={`url(#${gid})`} />}
        <path d={linePath} fill="none" stroke={tone} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {points.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="3.5" fill="var(--color-card)" stroke={tone} strokeWidth="2" />
        ))}
      </svg>
      {labels && (
        <div className="mt-2 flex justify-between px-1 text-xs text-muted-foreground">
          {labels.map((l, i) => (
            <span key={i}>{l}</span>
          ))}
        </div>
      )}
    </div>
  )
}

/* ---------------------------------- Bars ---------------------------------- */

export function BarChart({
  data,
  className,
  height = 200,
  tone = 'var(--color-chart-1)',
}: {
  data: { label: string; value: number }[]
  className?: string
  height?: number
  tone?: string
}) {
  const max = Math.max(...data.map((d) => d.value), 100)
  return (
    <div className={cn('w-full', className)} style={{ height }}>
      <div className="flex h-full items-end gap-3">
        {data.map((d) => (
          <div key={d.label} className="flex flex-1 flex-col items-center gap-2">
            <div className="flex w-full flex-1 items-end">
              <div
                className="w-full rounded-t-md transition-all duration-500"
                style={{ height: `${(d.value / max) * 100}%`, backgroundColor: tone }}
                title={`${d.label}: ${d.value}`}
              />
            </div>
            <span className="truncate text-xs text-muted-foreground">{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* --------------------------------- Donut ---------------------------------- */

export function DonutChart({
  value,
  size = 120,
  stroke = 12,
  tone,
  label,
}: {
  value: number
  size?: number
  stroke?: number
  tone?: string
  label?: React.ReactNode
}) {
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const clamped = Math.max(0, Math.min(100, value))
  const offset = circumference - (clamped / 100) * circumference
  const color =
    tone ??
    (clamped >= 75
      ? 'var(--color-success)'
      : clamped >= 50
        ? 'var(--color-chart-1)'
        : 'var(--color-warning)')

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-muted)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {label ?? <span className="font-display text-xl font-semibold">{clamped}%</span>}
      </div>
    </div>
  )
}
