'use client'

import * as React from 'react'
import {
  activity as initialActivity,
  dashboardStats as initialStats,
  insights as initialInsights,
  materials as initialMaterials,
  recommendations as initialRecommendations,
  studentRecommendations as initialStudentRecommendations,
  students as initialStudents,
  studentUser as initialStudentUser,
  topicMasteryOverview as initialTopicMastery,
} from './mock-data'
import type {
  AdaptiveTrack,
  ApprovalStatus,
  Insight,
  LearningLevel,
  Material,
  MaterialAnalysis,
  QuizQuestion,
  QuizResult,
  QuizSubmission,
  Recommendation,
  Student,
} from './types'
import {
  analyzeMaterial as aiAnalyzeMaterial,
  evaluateQuizSubmission as aiEvaluateQuiz,
  generateAdaptiveTracks as aiGenerateTracks,
  generateQuiz as aiGenerateQuiz,
  generateRecommendations as aiGenerateRecommendations,
} from './ai-service'

export interface StudentUserProfile {
  id?: string
  name: string
  email: string
  role?: string
  institutionName?: string
  level: LearningLevel
  currentSubject: string
  currentTopic: string
  streak: number
}

export interface TeacherUserProfile {
  id?: string
  name: string
  email: string
  role?: string
  institutionName?: string
  subject: string
  className: string
}

interface SessionState {
  materials: Material[]
  selectedTopic: string
  analyses: Record<string, MaterialAnalysis>
  adaptiveTracks: Record<string, AdaptiveTrack[]>
  quizzes: Record<string, QuizQuestion[]>
  approvalStatuses: Record<string, ApprovalStatus>
  students: Student[]
  studentUser: StudentUserProfile
  teacherUser: TeacherUserProfile
  studentQuizResults: QuizResult[]
  latestQuizSubmission: QuizSubmission | null
  teacherRecommendations: Recommendation[]
  studentRecommendations: Recommendation[]
  activityFeed: typeof initialActivity
  insightsList: Insight[]
  topicMastery: typeof initialTopicMastery
}

interface SessionContextValue extends SessionState {
  setSelectedTopic: (topic: string) => void
  uploadMaterial: (file: { name: string; subject: string; topic: string; type: Material['type'] }) => Promise<Material>
  analyzeTopic: (topic: string, materialName?: string) => Promise<MaterialAnalysis>
  getAdaptiveTracksForTopic: (topic: string) => Promise<AdaptiveTrack[]>
  updateTrackContent: (topic: string, level: LearningLevel, track: AdaptiveTrack) => void
  approveAndAssignTopic: (topic: string) => void
  getQuizForTopic: (topic: string, count?: number) => Promise<QuizQuestion[]>
  submitStudentQuiz: (topic: string, answers: Record<number, string>, questions: QuizQuestion[]) => Promise<QuizSubmission>
  assignRecommendation: (recId: string) => void
  resetToDefaults: () => void
  syncAuthenticatedUser: (authUser: {
    id?: string
    name?: string
    email?: string
    role?: string
    institutionName?: string
    className?: string
    subject?: string
  }) => void
}

export interface InitialSessionUser {
  id?: string
  name?: string
  email?: string
  role?: string
  institutionName?: string
  className?: string
  subject?: string
  teacherId?: string
  studentId?: string
}

const STORAGE_KEY = 'teachai_session_data_v2'

const SessionContext = React.createContext<SessionContextValue | null>(null)

export function SessionProvider({
  children,
  initialUser,
}: {
  children: React.ReactNode
  initialUser?: InitialSessionUser | null
}) {
  const [state, setState] = React.useState<SessionState>(() => {
    // If an authoritative session user exists from server cookies, use that user
    const baseStudentUser: StudentUserProfile = initialUser?.name
      ? {
          id: initialUser.id,
          name: initialUser.name,
          email: initialUser.email || initialStudentUser.email,
          role: initialUser.role || 'STUDENT',
          institutionName: initialUser.institutionName || 'M. Kumarasamy College of Engineering',
          level: 'Standard',
          currentSubject: 'Database Management Systems',
          currentTopic: 'ER Model',
          streak: 4,
        }
      : initialStudentUser

    const baseTeacherUser: TeacherUserProfile = initialUser?.name
      ? {
          id: initialUser.id,
          name: initialUser.name,
          email: initialUser.email || 'priya.menon@school.edu',
          role: initialUser.role || 'TEACHER',
          institutionName: initialUser.institutionName || 'M. Kumarasamy College of Engineering',
          className: initialUser.className || 'DBMS - III CSE A',
          subject: initialUser.subject || 'Database Management Systems',
        }
      : {
          name: 'Dr. Priya Menon',
          email: 'priya.menon@school.edu',
          subject: 'Database Management Systems',
          className: 'DBMS - III CSE A',
          institutionName: 'M. Kumarasamy College of Engineering',
        }

    return {
      materials: initialMaterials,
      selectedTopic: 'ER Model',
      analyses: {},
      adaptiveTracks: {},
      quizzes: {},
      approvalStatuses: {
        'ER Model': 'Approved',
        'Trigonometric Identities': 'Approved',
      },
      students: initialStudents,
      studentUser: baseStudentUser,
      teacherUser: baseTeacherUser,
      studentQuizResults: initialStudents[0].quizHistory,
      latestQuizSubmission: null,
      teacherRecommendations: initialRecommendations,
      studentRecommendations: initialStudentRecommendations,
      activityFeed: initialActivity,
      insightsList: initialInsights,
      topicMastery: initialTopicMastery,
    }
  })

  // Sync to localStorage
  React.useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch (e) {
      console.warn('Could not save session to localStorage', e)
    }
  }, [state])

  // Real-time synchronization with active server session
  const syncAuthenticatedUser = React.useCallback(
    (authUser: {
      id?: string
      name?: string
      email?: string
      role?: string
      institutionName?: string
      className?: string
      subject?: string
    }) => {
      if (!authUser || !authUser.name) return
      setState((prev) => ({
        ...prev,
        studentUser: {
          ...prev.studentUser,
          id: authUser.id,
          name: authUser.name!,
          email: authUser.email || prev.studentUser.email,
          role: authUser.role || prev.studentUser.role,
          institutionName: authUser.institutionName || 'M. Kumarasamy College of Engineering',
        },
        teacherUser: {
          ...prev.teacherUser,
          id: authUser.id,
          name: authUser.name!,
          email: authUser.email || prev.teacherUser.email,
          role: authUser.role || prev.teacherUser.role,
          institutionName: authUser.institutionName || 'M. Kumarasamy College of Engineering',
          className: authUser.className || prev.teacherUser.className,
          subject: authUser.subject || prev.teacherUser.subject,
        },
      }))
    },
    [],
  )

  // Fetch real authenticated session from /api/auth/me on mount
  React.useEffect(() => {
    let isMounted = true
    async function loadRealSession() {
      try {
        const res = await fetch('/api/auth/me')
        if (res.ok) {
          const data = await res.json()
          if (data.authenticated && data.user && isMounted) {
            syncAuthenticatedUser(data.user)
          }
        }
      } catch {
        // Graceful in offline demo mode
      }
    }
    loadRealSession()
    return () => {
      isMounted = false
    }
  }, [syncAuthenticatedUser])

  const setSelectedTopic = (topic: string) => {
    setState((prev) => ({ ...prev, selectedTopic: topic }))
  }

  const uploadMaterial = async (file: {
    name: string
    subject: string
    topic: string
    type: Material['type']
  }) => {
    const newMaterial: Material = {
      id: `mat-${Date.now()}`,
      name: file.name,
      subject: file.subject,
      topic: file.topic,
      type: file.type,
      date: new Date().toISOString().split('T')[0],
      status: 'Processed',
      sizeKb: Math.floor(Math.random() * 2500) + 800,
    }

    setState((prev) => ({
      ...prev,
      materials: [newMaterial, ...prev.materials],
      selectedTopic: file.topic,
      approvalStatuses: {
        ...prev.approvalStatuses,
        [file.topic]: 'Draft',
      },
      activityFeed: [
        {
          id: `act-${Date.now()}`,
          kind: 'upload',
          title: `New material uploaded: ${file.name}`,
          detail: `${file.subject} · ${file.topic}`,
          time: 'Just now',
        },
        ...prev.activityFeed,
      ],
    }))

    // Async backend synchronization
    try {
      fetch('/api/materials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(file),
      }).catch(() => {})
    } catch (_) {}

    return newMaterial
  }

  const analyzeTopic = async (topic: string, materialName = '') => {
    let analysis: MaterialAnalysis

    try {
      const res = await fetch('/api/materials/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, materialName }),
      })
      if (res.ok) {
        const data = await res.json()
        analysis = data.analysis
      } else {
        analysis = await aiAnalyzeMaterial(materialName || topic, topic)
      }
    } catch (_) {
      analysis = await aiAnalyzeMaterial(materialName || topic, topic)
    }

    setState((prev) => ({
      ...prev,
      analyses: {
        ...prev.analyses,
        [topic]: analysis,
      },
      approvalStatuses: {
        ...prev.approvalStatuses,
        [topic]: prev.approvalStatuses[topic] || 'Pending Review',
      },
      activityFeed: [
        {
          id: `act-${Date.now()}`,
          kind: 'analysis',
          title: `AI Pedagogical Analysis Completed`,
          detail: `${topic} — ${analysis.detectedConcepts.length} concepts extracted`,
          time: 'Just now',
        },
        ...prev.activityFeed,
      ],
    }))
    return analysis
  }

  const getAdaptiveTracksForTopic = async (topic: string) => {
    if (state.adaptiveTracks[topic]) {
      return state.adaptiveTracks[topic]
    }

    let tracks: AdaptiveTrack[]
    try {
      const res = await fetch('/api/adaptive/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic }),
      })
      if (res.ok) {
        const data = await res.json()
        tracks = data.tracks
      } else {
        tracks = await aiGenerateTracks(topic)
      }
    } catch (_) {
      tracks = await aiGenerateTracks(topic)
    }

    setState((prev) => ({
      ...prev,
      adaptiveTracks: {
        ...prev.adaptiveTracks,
        [topic]: tracks,
      },
    }))
    return tracks
  }

  const updateTrackContent = (topic: string, level: LearningLevel, updatedTrack: AdaptiveTrack) => {
    setState((prev) => {
      const currentList = prev.adaptiveTracks[topic] || []
      const newList = currentList.map((t) => (t.level === level ? updatedTrack : t))
      return {
        ...prev,
        adaptiveTracks: {
          ...prev.adaptiveTracks,
          [topic]: newList,
        },
      }
    })
  }

  const approveAndAssignTopic = (topic: string) => {
    // Dispatch to backend
    try {
      fetch('/api/adaptive/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, action: 'approve' }),
      }).catch(() => {})

      fetch('/api/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `${topic} Adaptive Path`,
          topic,
          subject: 'Computer Science',
          difficulty: 'Standard',
        }),
      }).catch(() => {})
    } catch (_) {}

    setState((prev) => {
      const isDBMS = topic.toLowerCase().includes('er') || topic.toLowerCase().includes('dbms')
      const newStudentRec: Recommendation = {
        id: `s-rec-${Date.now()}`,
        title: `Assigned Learning Path: ${topic}`,
        reason: `Teacher Dr. Priya Menon approved and assigned the ${topic} adaptive track.`,
        difficulty: 'Standard',
        estMinutes: 20,
        priority: 'High',
        actions: ['Study Adaptive Track', 'Complete Formative Check Quiz'],
        topic,
      }

      return {
        ...prev,
        approvalStatuses: {
          ...prev.approvalStatuses,
          [topic]: 'Assigned',
        },
        studentRecommendations: [newStudentRec, ...prev.studentRecommendations.filter((r) => r.topic !== topic)],
        studentUser: {
          ...prev.studentUser,
          currentTopic: topic,
          currentSubject: isDBMS ? 'Database Management Systems' : 'Mathematics',
        },
        activityFeed: [
          {
            id: `act-${Date.now()}`,
            kind: 'approval',
            title: `Teacher Approved & Assigned: ${topic}`,
            detail: `3-tier adaptive tracks and quiz deployed to Grade 10 students.`,
            time: 'Just now',
          },
          ...prev.activityFeed,
        ],
      }
    })
  }

  const getQuizForTopic = async (topic: string, count = 4) => {
    if (state.quizzes[topic] && state.quizzes[topic].length > 0) {
      return state.quizzes[topic]
    }

    let questions: QuizQuestion[]
    try {
      const res = await fetch('/api/quizzes/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, count }),
      })
      if (res.ok) {
        const data = await res.json()
        questions = data.questions
      } else {
        questions = await aiGenerateQuiz(topic, count, 'MCQ')
      }
    } catch (_) {
      questions = await aiGenerateQuiz(topic, count, 'MCQ')
    }

    setState((prev) => ({
      ...prev,
      quizzes: {
        ...prev.quizzes,
        [topic]: questions,
      },
    }))
    return questions
  }

  const submitStudentQuiz = async (
    topic: string,
    answers: Record<number, string>,
    questions: QuizQuestion[],
  ) => {
    let submission: QuizSubmission
    let newRecommendations: Recommendation[]

    try {
      const res = await fetch('/api/quizzes/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, answers, questions, studentId: 's1' }),
      })
      if (res.ok) {
        const data = await res.json()
        submission = data.submission
        newRecommendations = data.recommendations
      } else {
        submission = await aiEvaluateQuiz(topic, answers, questions)
        newRecommendations = aiGenerateRecommendations(topic, submission.identifiedGaps)
      }
    } catch (_) {
      submission = await aiEvaluateQuiz(topic, answers, questions)
      newRecommendations = aiGenerateRecommendations(topic, submission.identifiedGaps)
    }

    setState((prev) => {
      // 1. Update Student 1 (Alex Rivera) record
      const updatedStudents = prev.students.map((st) => {
        if (st.id === 's1') {
          // Update topic mastery
          const updatedTopicMastery = st.topicMastery.map((tm) => {
            if (tm.topic.toLowerCase() === topic.toLowerCase() || (topic.includes('ER') && tm.topic === 'ER Model') || (topic.includes('Trig') && tm.topic.includes('Trig'))) {
              return { ...tm, mastery: Math.min(100, Math.max(30, Math.round((tm.mastery + submission.percentage) / 2))) }
            }
            return tm
          })

          // Update weak topics
          let updatedWeak = [...st.weakTopics]
          if (submission.percentage < 70) {
            if (!updatedWeak.includes(topic)) updatedWeak.push(topic)
          } else {
            updatedWeak = updatedWeak.filter((w) => !w.includes(topic) && !topic.includes(w))
          }

          const newQuizResult: QuizResult = {
            id: `qr-${Date.now()}`,
            title: `${topic} Check Quiz`,
            date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            score: submission.percentage,
            total: submission.total,
            topic,
          }

          return {
            ...st,
            overallScore: Math.round((st.overallScore * 3 + submission.percentage) / 4),
            topicMastery: updatedTopicMastery,
            weakTopics: updatedWeak,
            quizHistory: [newQuizResult, ...st.quizHistory],
          }
        }
        return st
      })

      // 2. Update class-wide topic mastery overview
      const updatedOverview = prev.topicMastery.map((tm) => {
        if (topic.toLowerCase().includes(tm.label.toLowerCase()) || (topic.includes('ER') && tm.label === 'ER Model') || (topic.includes('Trig') && tm.label === 'Trig')) {
          return { ...tm, value: Math.round((tm.value * 2 + submission.percentage) / 3) }
        }
        return tm
      })

      // 3. Update activity feed
      const newActivityItem = {
        id: `act-${Date.now()}`,
        kind: 'quiz' as const,
        title: `Student Quiz Completed: ${topic}`,
        detail: `Alex Rivera scored ${submission.percentage}% (${submission.score}/${submission.total})`,
        time: 'Just now',
      }

      // 4. Update insights
      const newInsight: Insight = {
        id: `ins-${Date.now()}`,
        severity: submission.percentage < 70 ? 'critical' : 'info',
        message:
          submission.percentage < 70
            ? `Alex Rivera scored ${submission.percentage}% on ${topic}. Gaps detected in: ${submission.identifiedGaps.join(', ') || 'core concepts'}.`
            : `Alex Rivera mastered ${topic} with ${submission.percentage}% accuracy!`,
      }

      return {
        ...prev,
        students: updatedStudents,
        topicMastery: updatedOverview,
        latestQuizSubmission: submission,
        studentQuizResults: [
          {
            id: `qr-${Date.now()}`,
            title: `${topic} Check Quiz`,
            date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            score: submission.percentage,
            total: submission.total,
            topic,
          },
          ...prev.studentQuizResults,
        ],
        studentRecommendations: [
          ...newRecommendations,
          ...prev.studentRecommendations.filter((r) => r.topic !== topic),
        ],
        teacherRecommendations: [
          ...newRecommendations,
          ...prev.teacherRecommendations.filter((r) => r.topic !== topic),
        ],
        activityFeed: [newActivityItem, ...prev.activityFeed],
        insightsList: [newInsight, ...prev.insightsList],
      }
    })

    return submission
  }

  const assignRecommendation = (recId: string) => {
    setState((prev) => ({
      ...prev,
      activityFeed: [
        {
          id: `act-${Date.now()}`,
          kind: 'recommendation',
          title: `Intervention Assigned to Student`,
          detail: `Teacher dispatched personalized study track`,
          time: 'Just now',
        },
        ...prev.activityFeed,
      ],
    }))
  }

  const resetToDefaults = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY)
    }
    setState({
      materials: initialMaterials,
      selectedTopic: 'ER Model',
      analyses: {},
      adaptiveTracks: {},
      quizzes: {},
      approvalStatuses: {
        'ER Model': 'Approved',
        'Trigonometric Identities': 'Approved',
      },
      students: initialStudents,
      studentUser: initialStudentUser,
      teacherUser: {
        name: 'Dr. Priya Menon',
        email: 'priya.menon@school.edu',
        subject: 'Database Management Systems',
        className: 'DBMS - III CSE A',
        institutionName: 'M. Kumarasamy College of Engineering',
      },
      studentQuizResults: initialStudents[0].quizHistory,
      latestQuizSubmission: null,
      teacherRecommendations: initialRecommendations,
      studentRecommendations: initialStudentRecommendations,
      activityFeed: initialActivity,
      insightsList: initialInsights,
      topicMastery: initialTopicMastery,
    })
  }

  return (
    <SessionContext.Provider
      value={{
        ...state,
        setSelectedTopic,
        uploadMaterial,
        analyzeTopic,
        getAdaptiveTracksForTopic,
        updateTrackContent,
        approveAndAssignTopic,
        getQuizForTopic,
        submitStudentQuiz,
        assignRecommendation,
        resetToDefaults,
        syncAuthenticatedUser,
      }}
    >
      {children}
    </SessionContext.Provider>
  )
}

export function useAppSession() {
  const context = React.useContext(SessionContext)
  if (!context) {
    throw new Error('useAppSession must be used within a SessionProvider')
  }
  return context
}
