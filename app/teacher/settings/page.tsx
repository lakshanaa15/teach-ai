'use client'

import * as React from 'react'
import {
  Bell,
  CheckCircle2,
  GraduationCap,
  Lock,
  Save,
  Settings,
  Shield,
  Sliders,
  Sparkles,
  User,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { teacher } from '@/lib/mock-data'
import { useToast } from '@/components/shared/toast'

export default function TeacherSettingsPage() {
  const { toast } = useToast()

  const [name, setName] = React.useState(teacher.name)
  const [email, setEmail] = React.useState(teacher.email)
  const [subject, setSubject] = React.useState(teacher.subject)
  const [className, setClassName] = React.useState(teacher.className)

  // AI & Pedagogical preferences
  const [autoAdaptive, setAutoAdaptive] = React.useState(true)
  const [autoSimulation, setAutoSimulation] = React.useState(true)
  const [gapAlertThreshold, setGapAlertThreshold] = React.useState('60%')
  const [emailDigest, setEmailDigest] = React.useState(true)
  const [instantAlerts, setInstantAlerts] = React.useState(true)

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    toast({
      title: 'Settings saved',
      description: 'Teacher preferences and AI thresholds have been updated.',
    })
  }

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <PageHeader
        title="Teacher Portal Settings"
        description="Configure your teaching profile, classroom defaults, automated AI pipeline triggers, and real-time gap detection alerts."
        actions={
          <Button onClick={handleSave} className="gap-2 shadow-sm">
            <Save className="size-4" />
            Save Changes
          </Button>
        }
      />

      <form onSubmit={handleSave} className="space-y-6">
        {/* Profile Card */}
        <Card>
          <CardHeader className="border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <User className="size-5 text-primary" />
              <CardTitle className="text-base font-semibold">Teacher Profile</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 pt-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-9 w-full rounded-lg border border-input bg-card px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-9 w-full rounded-lg border border-input bg-card px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Subject
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="h-9 w-full rounded-lg border border-input bg-card px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Class / Grade Level
              </label>
              <input
                type="text"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                className="h-9 w-full rounded-lg border border-input bg-card px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2"
              />
            </div>
          </CardContent>
        </Card>

        {/* AI Pedagogical Configuration */}
        <Card>
          <CardHeader className="border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="size-5 text-primary" />
              <CardTitle className="text-base font-semibold">
                AI Automation & Generation Rules
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-4 text-sm">
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="font-medium text-foreground">Auto-generate 3-tier Adaptive Tracks</p>
                <p className="text-xs text-muted-foreground">
                  Automatically synthesize Remedial, Standard, and Advanced tracks upon document upload.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAutoAdaptive(!autoAdaptive)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  autoAdaptive ? 'bg-primary' : 'bg-muted'
                }`}
              >
                <span
                  className={`inline-block size-4 transform rounded-full bg-white transition-transform ${
                    autoAdaptive ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="font-medium text-foreground">Continuous Student Persona Simulation</p>
                <p className="text-xs text-muted-foreground">
                  Run 3-persona cognitive simulation when updating draft lesson plans.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAutoSimulation(!autoSimulation)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  autoSimulation ? 'bg-primary' : 'bg-muted'
                }`}
              >
                <span
                  className={`inline-block size-4 transform rounded-full bg-white transition-transform ${
                    autoSimulation ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="font-medium text-foreground">Learning Gap Diagnostic Threshold</p>
                <p className="text-xs text-muted-foreground">
                  Flag conceptual weakness when topic comprehension falls below this score.
                </p>
              </div>
              <select
                value={gapAlertThreshold}
                onChange={(e) => setGapAlertThreshold(e.target.value)}
                className="h-8 rounded-lg border border-input bg-card px-2 text-xs font-semibold outline-none"
              >
                <option value="50%">50%</option>
                <option value="60%">60% (Recommended)</option>
                <option value="70%">70%</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader className="border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <Bell className="size-5 text-primary" />
              <CardTitle className="text-base font-semibold">Notification Preferences</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-4 text-sm">
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="font-medium text-foreground">Instant Critical Gap Alerts</p>
                <p className="text-xs text-muted-foreground">
                  Receive browser notifications when more than 5 students fail a core identity check.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInstantAlerts(!instantAlerts)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  instantAlerts ? 'bg-primary' : 'bg-muted'
                }`}
              >
                <span
                  className={`inline-block size-4 transform rounded-full bg-white transition-transform ${
                    instantAlerts ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="font-medium text-foreground">Weekly Class Progress Digest</p>
                <p className="text-xs text-muted-foreground">
                  Receive summary of weekly growth curves, at-risk updates, and completed interventions.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEmailDigest(!emailDigest)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  emailDigest ? 'bg-primary' : 'bg-muted'
                }`}
              >
                <span
                  className={`inline-block size-4 transform rounded-full bg-white transition-transform ${
                    emailDigest ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="submit" size="sm" className="gap-2 shadow-sm">
            <Save className="size-4" />
            Save Preferences
          </Button>
        </div>
      </form>
    </div>
  )
}
