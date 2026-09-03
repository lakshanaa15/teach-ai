'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  Check,
  Clock,
  Copy,
  Edit2,
  FileCheck2,
  GraduationCap,
  Layers,
  ListOrdered,
  MoreVertical,
  Plus,
  School,
  Search,
  Sparkles,
  Trash2,
  Users,
  X,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmptyState, Skeleton } from '@/components/shared/states'
import { useToast } from '@/components/shared/toast'

interface ClassTopic {
  id: string
  title: string
  order: number
  isActive: boolean
}

interface EnrolledStudentItem {
  id: string
  name: string
  email: string
  grade: string
  level: string
  overallScore: number
  joinedAt: string
}

interface TeacherClass {
  id: string
  name: string
  classCode: string
  subject: string
  subjectCode?: string
  academicYear?: string
  department?: string
  section?: string
  studentCount: number
  lessonsCount?: number
  quizzesCount?: number
  description?: string
  topics?: ClassTopic[]
  createdAt?: string
}

export default function ClassesPage() {
  const { toast } = useToast()

  const [classes, setClasses] = React.useState<TeacherClass[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [search, setSearch] = React.useState('')
  const [copiedCode, setCopiedCode] = React.useState<string | null>(null)

  // Create Class Form State
  const [showCreateModal, setShowCreateModal] = React.useState(false)
  const [academicYear, setAcademicYear] = React.useState('III Year')
  const [department, setDepartment] = React.useState('CSE')
  const [section, setSection] = React.useState('A')
  const [subject, setSubject] = React.useState('Database Management Systems')
  const [subjectCode, setSubjectCode] = React.useState('CS301')
  const [customClassName, setCustomClassName] = React.useState('III CSE A')
  const [initialTopicsText, setInitialTopicsText] = React.useState(
    'ER Model\nRelational Model\nNormalization\nSQL',
  )
  const [description, setDescription] = React.useState('')
  const [isCreatingClass, setIsCreatingClass] = React.useState(false)

  // Edit Class State
  const [editingClass, setEditingClass] = React.useState<TeacherClass | null>(null)
  const [isUpdatingClass, setIsUpdatingClass] = React.useState(false)

  // Topics / Syllabus Modal State
  const [syllabusClass, setSyllabusClass] = React.useState<TeacherClass | null>(null)
  const [newTopicTitle, setNewTopicTitle] = React.useState('')
  const [isAddingTopic, setIsAddingTopic] = React.useState(false)

  // Enrolled Students Modal State
  const [rosterClass, setRosterClass] = React.useState<TeacherClass | null>(null)
  const [rosterStudents, setRosterStudents] = React.useState<EnrolledStudentItem[]>([])
  const [isLoadingRoster, setIsLoadingRoster] = React.useState(false)

  // Auto-compose class name when Year, Dept, Section change
  React.useEffect(() => {
    setCustomClassName(`${academicYear} ${department} ${section}`.trim())
  }, [academicYear, department, section])

  React.useEffect(() => {
    fetchClasses()
  }, [])

  const fetchClasses = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/classes')
      const data = await res.json()
      if (res.ok && Array.isArray(data.classes)) {
        setClasses(data.classes)
      } else {
        setClasses([])
      }
    } catch {
      setClasses([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!subject.trim()) {
      toast({ title: 'Validation Error', description: 'Subject is required.' })
      return
    }
    setIsCreatingClass(true)

    const initialTopics = initialTopicsText
      .split('\n')
      .map((t) => t.trim())
      .filter(Boolean)

    try {
      const res = await fetch('/api/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          academicYear: academicYear.trim(),
          department: department.trim(),
          section: section.trim(),
          subject: subject.trim(),
          subjectCode: subjectCode.trim() || undefined,
          name: customClassName.trim(),
          description: description.trim() || undefined,
          initialTopics,
        }),
      })

      const data = await res.json()
      if (res.ok && data.success && data.class) {
        setClasses((prev) => [data.class, ...prev])
        setShowCreateModal(false)
        setDescription('')
        toast({
          title: 'Teaching Assignment Created! 🎉',
          description: `Class "${data.class.name}" with subject "${data.class.subject}" and class code "${data.class.classCode}" is ready.`,
        })
      } else {
        toast({
          title: 'Failed to create class',
          description: data.error || 'Please try again.',
        })
      }
    } catch {
      toast({
        title: 'Connection error',
        description: 'Could not connect to the class service.',
      })
    } finally {
      setIsCreatingClass(false)
    }
  }

  const handleUpdateClass = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingClass) return
    setIsUpdatingClass(true)

    try {
      const res = await fetch(`/api/classes/${editingClass.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingClass),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setClasses((prev) =>
          prev.map((c) => (c.id === editingClass.id ? { ...c, ...editingClass } : c)),
        )
        setEditingClass(null)
        toast({ title: 'Class Updated', description: 'Changes saved successfully.' })
      } else {
        toast({ title: 'Update Failed', description: data.error || 'Could not update class.' })
      }
    } catch {
      toast({ title: 'Error', description: 'Network error updating class.' })
    } finally {
      setIsUpdatingClass(false)
    }
  }

  const handleDeleteClass = async (classId: string, className: string) => {
    if (!confirm(`Are you sure you want to delete "${className}"? All associated lesson plans and syllabus topics will be removed.`)) {
      return
    }

    try {
      const res = await fetch(`/api/classes/${classId}`, { method: 'DELETE' })
      if (res.ok) {
        setClasses((prev) => prev.filter((c) => c.id !== classId))
        toast({ title: 'Class Deleted', description: `"${className}" has been removed.` })
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to delete class.' })
    }
  }

  const openSyllabusModal = async (cls: TeacherClass) => {
    setSyllabusClass(cls)
    setNewTopicTitle('')
    try {
      const res = await fetch(`/api/classes/${cls.id}/topics`)
      const data = await res.json()
      if (res.ok && Array.isArray(data.topics)) {
        setSyllabusClass((prev) => (prev ? { ...prev, topics: data.topics } : null))
      }
    } catch {}
  }

  const handleAddTopic = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!syllabusClass || !newTopicTitle.trim()) return
    setIsAddingTopic(true)

    try {
      const res = await fetch(`/api/classes/${syllabusClass.id}/topics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTopicTitle.trim() }),
      })
      const data = await res.json()
      if (res.ok && data.success && data.topic) {
        const updatedTopics = [...(syllabusClass.topics || []), data.topic]
        setSyllabusClass({ ...syllabusClass, topics: updatedTopics })
        setClasses((prev) =>
          prev.map((c) => (c.id === syllabusClass.id ? { ...c, topics: updatedTopics } : c)),
        )
        setNewTopicTitle('')
        toast({ title: 'Topic Added', description: `"${data.topic.title}" added to syllabus.` })
      }
    } catch {
      toast({ title: 'Error', description: 'Could not add topic.' })
    } finally {
      setIsAddingTopic(false)
    }
  }

  const handleDeleteTopic = async (topicId: string) => {
    if (!syllabusClass) return
    try {
      const res = await fetch(`/api/classes/${syllabusClass.id}/topics/${topicId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        const updatedTopics = (syllabusClass.topics || []).filter((t) => t.id !== topicId)
        setSyllabusClass({ ...syllabusClass, topics: updatedTopics })
        setClasses((prev) =>
          prev.map((c) => (c.id === syllabusClass.id ? { ...c, topics: updatedTopics } : c)),
        )
        toast({ title: 'Topic Removed', description: 'Topic removed from syllabus.' })
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to delete topic.' })
    }
  }

  const openRosterModal = async (cls: TeacherClass) => {
    setRosterClass(cls)
    setIsLoadingRoster(true)
    try {
      const res = await fetch(`/api/classes/${cls.id}/students`)
      const data = await res.json()
      if (res.ok && Array.isArray(data.students)) {
        setRosterStudents(data.students)
      } else {
        setRosterStudents([])
      }
    } catch {
      setRosterStudents([])
    } finally {
      setIsLoadingRoster(false)
    }
  }

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    toast({
      title: 'Class Code Copied! 📋',
      description: `Code "${code}" copied to clipboard. Share with students for instant enrollment.`,
    })
    setTimeout(() => setCopiedCode(null), 2500)
  }

  const filteredClasses = classes.filter((cls) => {
    const term = search.toLowerCase()
    return (
      cls.name.toLowerCase().includes(term) ||
      (cls.subject && cls.subject.toLowerCase().includes(term)) ||
      cls.classCode.toLowerCase().includes(term)
    )
  })

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <PageHeader
        title="Manage Classes & Teaching Assignments"
        description="Configure your academic year, department, section, subjects, and class syllabi. Share unique class codes with students to manage real enrollments."
        actions={
          <Button
            onClick={() => setShowCreateModal(true)}
            size="sm"
            className="gap-1.5 shadow-sm font-semibold"
          >
            <Plus className="size-4" />
            Create Teaching Assignment
          </Button>
        }
      />

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search classes, subjects, or class codes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full rounded-lg border border-input bg-card pl-9 pr-3 text-xs outline-none focus-visible:border-ring focus-visible:ring-2"
          />
        </div>
      </div>

      {/* Classes Grid */}
      {isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-56 rounded-xl" />
          ))}
        </div>
      ) : filteredClasses.length === 0 ? (
        <Card className="border-dashed border-2 border-border p-12 text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4">
            <School className="size-7" />
          </div>
          <h3 className="font-display text-lg font-bold text-foreground">No classes created yet</h3>
          <p className="mt-1 text-xs text-muted-foreground max-w-md mx-auto">
            Set up your teaching assignment by specifying the year, department, section, and subject.
          </p>
          <Button
            onClick={() => setShowCreateModal(true)}
            size="sm"
            className="mt-5 gap-1.5 font-semibold"
          >
            <Plus className="size-4" />
            Create Your First Class
          </Button>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredClasses.map((cls) => (
            <Card
              key={cls.id}
              className="flex flex-col justify-between border-border bg-card p-5 shadow-sm transition-all hover:border-primary/40 hover:shadow-md"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-display text-base font-bold text-foreground leading-tight">
                        {cls.name}
                      </h3>
                      {cls.subjectCode && (
                        <Badge variant="outline" className="text-[10px] font-mono">
                          {cls.subjectCode}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs font-semibold text-primary">{cls.subject}</p>
                    {(cls.academicYear || cls.department) && (
                      <p className="text-[11px] text-muted-foreground">
                        {cls.academicYear} • {cls.department} Dept • Sec {cls.section || 'A'}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setEditingClass(cls)}
                      className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                      title="Edit Class"
                    >
                      <Edit2 className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteClass(cls.id, cls.name)}
                      className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      title="Delete Class"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>

                {cls.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{cls.description}</p>
                )}

                {/* Class Code Badge */}
                <div className="flex items-center justify-between rounded-lg bg-muted/40 p-2.5 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">Code:</span>
                    <span className="font-mono font-bold text-foreground">{cls.classCode}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => copyToClipboard(cls.classCode)}
                    className="h-6 gap-1 px-2 text-[11px]"
                  >
                    {copiedCode === cls.classCode ? (
                      <>
                        <Check className="size-3 text-success" />
                        <span className="text-success font-medium">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="size-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </Button>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1">
                  <div className="rounded border border-border bg-background p-1.5">
                    <span className="text-[10px] text-muted-foreground block">Students</span>
                    <span className="font-bold font-mono">{cls.studentCount || 0}</span>
                  </div>
                  <div className="rounded border border-border bg-background p-1.5">
                    <span className="text-[10px] text-muted-foreground block">Topics</span>
                    <span className="font-bold font-mono">{cls.topics?.length || 0}</span>
                  </div>
                  <div className="rounded border border-border bg-background p-1.5">
                    <span className="text-[10px] text-muted-foreground block">Lessons</span>
                    <span className="font-bold font-mono">{cls.lessonsCount || 0}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 pt-3 border-t border-border flex flex-wrap items-center justify-between gap-2 text-xs">
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => openSyllabusModal(cls)}
                  className="gap-1 text-xs"
                >
                  <ListOrdered className="size-3.5 text-primary" />
                  Syllabus ({cls.topics?.length || 0})
                </Button>

                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => openRosterModal(cls)}
                  className="gap-1 text-xs"
                >
                  <Users className="size-3.5 text-primary" />
                  Enrolled ({cls.studentCount || 0})
                </Button>

                <Link href={`/teacher/lesson-plans?classId=${cls.id}`}>
                  <Button size="xs" className="gap-1 text-xs">
                    <Plus className="size-3" />
                    New Lesson
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* CREATE TEACHING ASSIGNMENT MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in">
          <Card className="w-full max-w-lg border-border bg-card shadow-xl max-h-[90vh] overflow-y-auto">
            <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-3">
              <div>
                <CardTitle className="text-base font-bold">Create Teaching Assignment</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Define your year, department, section, subject, and initial syllabus topics.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="rounded p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="size-4" />
              </button>
            </CardHeader>

            <form onSubmit={handleCreateClass}>
              <CardContent className="space-y-4 p-5 text-xs">
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="font-semibold text-foreground">Academic Year</label>
                    <select
                      value={academicYear}
                      onChange={(e) => setAcademicYear(e.target.value)}
                      className="h-8 w-full rounded border border-input bg-background px-2 text-xs"
                    >
                      <option value="I Year">I Year</option>
                      <option value="II Year">II Year</option>
                      <option value="III Year">III Year</option>
                      <option value="IV Year">IV Year</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-foreground">Department</label>
                    <select
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="h-8 w-full rounded border border-input bg-background px-2 text-xs"
                    >
                      <option value="CSE">CSE</option>
                      <option value="IT">IT</option>
                      <option value="ECE">ECE</option>
                      <option value="EEE">EEE</option>
                      <option value="MECH">MECH</option>
                      <option value="CIVIL">CIVIL</option>
                      <option value="AIDS">AIDS</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-foreground">Section</label>
                    <select
                      value={section}
                      onChange={(e) => setSection(e.target.value)}
                      className="h-8 w-full rounded border border-input bg-background px-2 text-xs"
                    >
                      <option value="A">Section A</option>
                      <option value="B">Section B</option>
                      <option value="C">Section C</option>
                      <option value="D">Section D</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2 space-y-1">
                    <label className="font-semibold text-foreground">
                      Subject Name <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Database Management Systems"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="h-8 w-full rounded border border-input bg-background px-2.5 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-muted-foreground">Subject Code</label>
                    <input
                      type="text"
                      placeholder="e.g. CS301"
                      value={subjectCode}
                      onChange={(e) => setSubjectCode(e.target.value)}
                      className="h-8 w-full rounded border border-input bg-background px-2.5 text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-foreground">
                    Class Display Name <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={customClassName}
                    onChange={(e) => setCustomClassName(e.target.value)}
                    placeholder="e.g. III CSE A"
                    className="h-8 w-full rounded border border-input bg-background px-2.5 text-xs font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-foreground">
                    Initial Syllabus Topics (One topic per line)
                  </label>
                  <textarea
                    rows={4}
                    value={initialTopicsText}
                    onChange={(e) => setInitialTopicsText(e.target.value)}
                    placeholder="e.g.&#10;ER Model&#10;Relational Model&#10;Normalization&#10;SQL"
                    className="w-full rounded border border-input bg-background p-2 text-xs font-mono resize-none"
                  />
                  <span className="text-[10px] text-muted-foreground">
                    These topics will automatically populate your lesson plan and quiz creation dropdowns.
                  </span>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-muted-foreground">Optional Description</label>
                  <input
                    type="text"
                    placeholder="e.g. Odd Semester 2026 Core Course"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="h-8 w-full rounded border border-input bg-background px-2.5 text-xs"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCreateModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isCreatingClass}
                    className="gap-1.5 font-semibold"
                  >
                    {isCreatingClass ? 'Creating Class...' : 'Save & Generate Code'}
                  </Button>
                </div>
              </CardContent>
            </form>
          </Card>
        </div>
      )}

      {/* EDIT CLASS MODAL */}
      {editingClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in">
          <Card className="w-full max-w-md border-border bg-card shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-3">
              <CardTitle className="text-base font-bold">Edit Class Details</CardTitle>
              <button
                type="button"
                onClick={() => setEditingClass(null)}
                className="rounded p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="size-4" />
              </button>
            </CardHeader>

            <form onSubmit={handleUpdateClass}>
              <CardContent className="space-y-3 p-5 text-xs">
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Class Name</label>
                  <input
                    type="text"
                    value={editingClass.name}
                    onChange={(e) => setEditingClass({ ...editingClass, name: e.target.value })}
                    className="h-8 w-full rounded border border-input bg-background px-2.5 text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-semibold text-foreground">Subject</label>
                    <input
                      type="text"
                      value={editingClass.subject}
                      onChange={(e) => setEditingClass({ ...editingClass, subject: e.target.value })}
                      className="h-8 w-full rounded border border-input bg-background px-2.5 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-muted-foreground">Subject Code</label>
                    <input
                      type="text"
                      value={editingClass.subjectCode || ''}
                      onChange={(e) => setEditingClass({ ...editingClass, subjectCode: e.target.value })}
                      className="h-8 w-full rounded border border-input bg-background px-2.5 text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="font-semibold text-foreground">Year</label>
                    <input
                      type="text"
                      value={editingClass.academicYear || ''}
                      onChange={(e) => setEditingClass({ ...editingClass, academicYear: e.target.value })}
                      className="h-8 w-full rounded border border-input bg-background px-2.5 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-foreground">Dept</label>
                    <input
                      type="text"
                      value={editingClass.department || ''}
                      onChange={(e) => setEditingClass({ ...editingClass, department: e.target.value })}
                      className="h-8 w-full rounded border border-input bg-background px-2.5 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-foreground">Section</label>
                    <input
                      type="text"
                      value={editingClass.section || ''}
                      onChange={(e) => setEditingClass({ ...editingClass, section: e.target.value })}
                      className="h-8 w-full rounded border border-input bg-background px-2.5 text-xs"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingClass(null)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" disabled={isUpdatingClass}>
                    {isUpdatingClass ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </CardContent>
            </form>
          </Card>
        </div>
      )}

      {/* TOPICS / SYLLABUS MODAL */}
      {syllabusClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in">
          <Card className="w-full max-w-lg border-border bg-card shadow-xl max-h-[85vh] flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-3">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <ListOrdered className="size-4 text-primary" />
                  Syllabus Topics: {syllabusClass.name}
                </CardTitle>
                <p className="text-xs text-muted-foreground">{syllabusClass.subject}</p>
              </div>
              <button
                type="button"
                onClick={() => setSyllabusClass(null)}
                className="rounded p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="size-4" />
              </button>
            </CardHeader>

            <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              {/* Add Topic Form */}
              <form onSubmit={handleAddTopic} className="flex gap-2">
                <input
                  type="text"
                  required
                  placeholder="Enter new syllabus topic (e.g. Transactions & Concurrency)..."
                  value={newTopicTitle}
                  onChange={(e) => setNewTopicTitle(e.target.value)}
                  className="h-8 flex-1 rounded border border-input bg-background px-2.5 text-xs outline-none focus-visible:border-ring"
                />
                <Button type="submit" size="xs" disabled={isAddingTopic} className="gap-1 shrink-0">
                  <Plus className="size-3" />
                  Add Topic
                </Button>
              </form>

              {/* Topics List */}
              {(!syllabusClass.topics || syllabusClass.topics.length === 0) ? (
                <div className="rounded-lg border border-dashed border-border p-6 text-center text-muted-foreground">
                  No topics added yet. Add a topic above to begin creating lesson plans.
                </div>
              ) : (
                <div className="space-y-2">
                  {syllabusClass.topics.map((top, idx) => (
                    <div
                      key={top.id || idx}
                      className="flex items-center justify-between rounded-lg border border-border bg-background p-2.5 transition-colors hover:border-primary/40"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="flex size-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                          {idx + 1}
                        </span>
                        <span className="font-semibold text-foreground">{top.title}</span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleDeleteTopic(top.id)}
                          className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          title="Delete Topic"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-3 border-t border-border flex justify-end">
              <Button size="sm" variant="outline" onClick={() => setSyllabusClass(null)}>
                Done
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* ENROLLED STUDENTS ROSTER MODAL */}
      {rosterClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in">
          <Card className="w-full max-w-2xl border-border bg-card shadow-xl max-h-[85vh] flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-3">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Users className="size-4 text-primary" />
                  Enrolled Students: {rosterClass.name}
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Class Code: <strong className="font-mono">{rosterClass.classCode}</strong> • {rosterClass.subject}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRosterClass(null)}
                className="rounded p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="size-4" />
              </button>
            </CardHeader>

            <div className="p-5 overflow-y-auto flex-1 text-xs">
              {isLoadingRoster ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full rounded" />
                  ))}
                </div>
              ) : rosterStudents.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-8 text-center space-y-2">
                  <p className="font-semibold text-foreground">No students have joined this class yet.</p>
                  <p className="text-muted-foreground text-xs">
                    Share class code <strong className="font-mono text-foreground">{rosterClass.classCode}</strong> with your students to enroll them.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {rosterStudents.map((st) => (
                    <div
                      key={st.id}
                      className="flex items-center justify-between rounded-lg border border-border bg-background p-3"
                    >
                      <div className="space-y-0.5">
                        <span className="font-bold text-foreground text-xs block">{st.name}</span>
                        <span className="text-[11px] text-muted-foreground font-mono">{st.email}</span>
                      </div>

                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="text-[10px]">
                          {st.level || 'Standard'}
                        </Badge>
                        <div className="text-right">
                          <span className="text-[10px] text-muted-foreground block">Mastery</span>
                          <span className="font-bold font-mono text-xs">{st.overallScore || 70}%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-3 border-t border-border flex justify-end">
              <Button size="sm" variant="outline" onClick={() => setRosterClass(null)}>
                Close
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
