import { Badge } from '@/components/ui/badge'
import type { LearningLevel, Priority, StudentStatus } from '@/lib/types'
import { ArrowUp, Circle, GraduationCap, Layers, Rocket } from 'lucide-react'

export function LevelBadge({ level }: { level: LearningLevel }) {
  const map = {
    Remedial: { variant: 'warning' as const, icon: Layers },
    Standard: { variant: 'default' as const, icon: GraduationCap },
    Advanced: { variant: 'success' as const, icon: Rocket },
  }
  const { variant, icon: Icon } = map[level]
  return (
    <Badge variant={variant}>
      <Icon />
      {level}
    </Badge>
  )
}

export function StatusBadge({ status }: { status: StudentStatus }) {
  const map = {
    'On Track': 'success' as const,
    'Needs Attention': 'warning' as const,
    'At Risk': 'destructive' as const,
  }
  return (
    <Badge variant={map[status]}>
      <Circle className="fill-current" />
      {status}
    </Badge>
  )
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  const map = {
    High: 'destructive' as const,
    Medium: 'warning' as const,
    Low: 'muted' as const,
  }
  return (
    <Badge variant={map[priority]}>
      {priority === 'High' && <ArrowUp />}
      {priority} priority
    </Badge>
  )
}
