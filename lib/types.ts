export type LearningLevel = 'Remedial' | 'Standard' | 'Advanced'
export type StudentStatus = 'On Track' | 'Needs Attention' | 'At Risk'
export type Priority = 'High' | 'Medium' | 'Low'
export type ApprovalStatus = 'Draft' | 'Pending Review' | 'Approved' | 'Assigned'

export interface TopicMastery {
  topic: string
  mastery: number
}

export interface QuizResult {
  id: string
  title: string
  date: string
  score: number
  total?: number
  topic?: string
}

export interface Student {
  id: string
  name: string
  email: string
  grade: string
  level: LearningLevel
  overallScore: number
  progress: number
  status: StudentStatus
  weakTopics: string[]
  strengths: string[]
  performanceTrend: number[]
  topicMastery: TopicMastery[]
  quizHistory: QuizResult[]
  nextActivities: string[]
}

export interface Material {
  id: string
  name: string
  subject: string
  topic: string
  type: 'PDF' | 'Slides' | 'Document' | 'Video'
  date: string
  status: 'Processed' | 'Processing' | 'Needs Review'
  sizeKb: number
}

export interface MaterialAnalysis {
  materialId?: string
  topic: string
  subject: string
  detectedConcepts: string[]
  difficulty: LearningLevel
  prerequisites: string[]
  commonMisconceptions: string[]
  learningOutcomes: string[]
  approvalStatus: ApprovalStatus
  analyzedAt: string
}

export interface ActivityItem {
  id: string
  kind: 'upload' | 'quiz' | 'analysis' | 'gap' | 'recommendation' | 'approval'
  title: string
  detail: string
  time: string
}

export interface Insight {
  id: string
  severity: 'info' | 'warning' | 'critical'
  message: string
}

export interface Recommendation {
  id: string
  title: string
  reason: string
  difficulty: LearningLevel
  estMinutes: number
  priority: Priority
  actions: string[]
  studentName?: string
  topic: string
}

export interface QuizQuestion {
  id: string
  type: 'MCQ' | 'True/False' | 'Short Answer'
  question: string
  options?: string[]
  answer: string
  explanation: string
  concept?: string
}

export interface ConceptResult {
  concept: string
  correct: boolean
  feedback: string
}

export interface QuizSubmission {
  id: string
  quizTitle: string
  topic: string
  score: number
  total: number
  percentage: number
  conceptResults: ConceptResult[]
  identifiedGaps: string[]
  date: string
}

export interface SimulatedStudent {
  profile: 'Struggling Student' | 'Average Student' | 'Advanced Student'
  understanding: number
  response: string
  confusionPoints: string[]
  misconceptions: string[]
}

export interface LessonAnalysis {
  effectiveness: number
  confusingSections: string[]
  misconceptions: string[]
  engagement: number
  improvements: string[]
}

export interface LessonPlanScore {
  overall: number
  verdict: string
  breakdown: { label: string; score: number }[]
  strengths: string[]
  issues: string[]
  improvements: string[]
}

export interface AdaptiveTrack {
  level: LearningLevel
  summary: string
  points: string[]
  example: string
  practice: string
  isApproved?: boolean
}

export interface Resource {
  id: string
  title: string
  type: 'Video' | 'Article' | 'Diagram' | 'Practice'
  difficulty: LearningLevel
  estMinutes: number
  reason: string
  url: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
}
