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
  fileUrl?: string
  rawText?: string
  classId?: string
  lessonPlanId?: string
}

export interface MaterialAnalysis {
  materialId?: string
  sourceDoc?: string
  topic: string
  subject: string
  title?: string
  summary?: string
  detectedConcepts: string[]
  coreConcepts?: string[]
  subConcepts?: string[]
  difficulty: LearningLevel
  prerequisites: string[]
  commonMisconceptions: string[]
  learningOutcomes: string[]
  importantTopics?: string[]
  suggestedLessonTopics?: string[]
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

export interface DiagnosedGap {
  concept: string
  severity: 'High' | 'Medium' | 'Low'
  evidence: string
  likelyCause: string
  confidence?: number
}

export interface StudentStrength {
  concept: string
  evidence: string
}

export interface DiagnosedMisconception {
  concept: string
  misconception: string
  evidence: string
  correctionStrategy: string
}

export interface DiagnosticRecommendationItem {
  id?: string
  priority: Priority
  type: string
  targetConcept: string
  reason: string
  action: string
  suggestedActivity: string
  recommendedTier: LearningLevel
  estimatedTime?: string | number
  followUpAssessment?: string
  actions?: string[]
}

export interface DiagnosticReport {
  studentSummary: string
  overallAssessment: string
  masteryScore: number
  status?: string
  diagnosedGaps: DiagnosedGap[]
  strengths: StudentStrength[]
  recommendations: DiagnosticRecommendationItem[]
  misconceptions: DiagnosedMisconception[]
  nextStep: string
  teacherSummary: string
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
  type?: string
  targetConcept?: string
  suggestedActivity?: string
  recommendedTier?: LearningLevel
  followUpAssessment?: string
  likelyCause?: string
  evidence?: string
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

export interface QuizLearningGap {
  concept: string
  severity: 'High' | 'Medium' | 'Low'
  evidence: string[]
  pattern: string
  likelyCause: string
  confidence: number
}

export interface QuizMisconception {
  concept: string
  misconception: string
  evidence: string
  correctionStrategy: string
  confidence: number
}

export interface QuizStrength {
  concept: string
  evidence: string
  confidence?: number
}

export interface QuizLearningAction {
  priority: 'High' | 'Medium' | 'Low'
  concept: string
  action: string
  reason: string
  suggestedActivity: string
  estimatedTime?: string
}

export interface QuizLearningAnalysis {
  overallSummary: string
  performance: {
    score: number
    percentage: number
    status: 'Needs Support' | 'On Track' | 'Excelling'
  }
  strengths: QuizStrength[]
  learningGaps: QuizLearningGap[]
  misconceptions: QuizMisconception[]
  difficultyAnalysis?: {
    available: boolean
    summary: string
  }
  recommendedTier: LearningLevel
  nextLearningActions: QuizLearningAction[]
  teacherSummary: string
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
  learningAnalysis?: QuizLearningAnalysis
}

export interface PracticeQuestion {
  id: string
  type: 'MCQ' | 'True/False' | 'Short Answer'
  question: string
  options?: string[]
  answer: string
  explanation: string
  concept: string
  difficulty: 'Easy' | 'Medium' | 'Hard'
  skill?: string
  targetedMisconception?: string
}

export interface PersonalizedPracticeSet {
  id: string
  title: string
  topic: string
  targetConcepts: string[]
  recommendedTier: LearningLevel
  reason: string
  estimatedMinutes: number
  questions: PracticeQuestion[]
  generatedAt: string
}

export interface PracticeEvaluationResult {
  score: number
  total: number
  percentage: number
  results: {
    questionId: string
    question: string
    concept: string
    studentAnswer: string
    correctAnswer: string
    correct: boolean
    explanation: string
  }[]
  conceptsMastered: string[]
  conceptsStillWeak: string[]
  summary: string
  recommendedNextStep: string
}

export interface RevisionActivity {
  id?: string
  type: 'Review' | 'Practice' | 'Reinforce' | 'Reassess'
  title: string
  description: string
  durationMinutes: number
  targetConcept: string
  isCompleted?: boolean
  practiceUrl?: string
}

export interface RevisionDayPlan {
  day: number
  date?: string
  focusConcepts: string[]
  priority: 'High' | 'Medium' | 'Low'
  goal: string
  estimatedMinutes: number
  activities: RevisionActivity[]
  isCompleted?: boolean
}

export interface RevisionPriorityArea {
  concept: string
  priority: 'High' | 'Medium' | 'Low'
  currentMastery?: number
  reason: string
}

export interface PersonalizedRevisionPlan {
  id: string
  studentId?: string
  studentName?: string
  topic: string
  subject?: string
  title: string
  overallGoal: string
  currentMastery: number
  recommendedTier: LearningLevel
  durationDays: number
  priorityAreas: RevisionPriorityArea[]
  dailyPlans: RevisionDayPlan[]
  reassessment: {
    recommended: boolean
    targetConcepts: string[]
    reason: string
    suggestedQuizTopic?: string
  }
  generatedAt: string
}

export interface ClassroomStudentInsight {
  id: string
  name: string
  mastery: number
  quizAverage: number
  tier: LearningLevel
  weakConcepts: string[]
  needsIntervention: boolean
}

export interface ClassroomMisconception {
  concept: string
  misconception: string
  evidence: string
  confidence: 'High' | 'Medium' | 'Low'
  suggestedCorrection: string
}

export interface ClassroomTeachingRecommendation {
  priority: 'High' | 'Medium' | 'Low'
  action: string
  reason: string
  targetGroup: 'All' | 'Remedial' | 'Standard' | 'Advanced'
  suggestedFeatureLink?: string
}

export interface ClassroomInsightsResult {
  id: string
  classId: string
  className: string
  topic: string
  subject?: string
  generatedAt: string
  classSummary: {
    overallMastery: number
    averageAssessmentScore: number
    studentsAnalyzed: number
    strugglingCount: number
    onTrackCount: number
    advancedCount: number
  }
  keyFindings: {
    finding: string
    evidence: string
    severity: 'High' | 'Medium' | 'Low'
  }[]
  commonMisconceptions: ClassroomMisconception[]
  studentGroups: {
    remedial: ClassroomStudentInsight[]
    standard: ClassroomStudentInsight[]
    advanced: ClassroomStudentInsight[]
    intervention: ClassroomStudentInsight[]
  }
  teachingRecommendations: ClassroomTeachingRecommendation[]
  differentiation: {
    remedial: string[]
    standard: string[]
    advanced: string[]
  }
  nextSteps: string[]
  trendAnalysis?: string
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

export interface StudentSimulationResult {
  students: SimulatedStudent[]
  analysis: LessonAnalysis
  sourceMetadata: {
    sourceType: 'uploaded_pdf' | 'class_lesson' | 'demo'
    sourceName: string
    subject: string
    topic: string
    materialId?: string
    charCount?: number
  }
}

export interface LearningPathModule {
  moduleNumber: number
  title: string
  description: string
  estimatedHours: number
  keyConcepts: string[]
  learningOutcomes: string[]
  assessmentType: string
}

export interface CourseLearningPath {
  courseTitle: string
  subject: string
  targetAudience: string
  overview: string
  totalDurationWeeks: number
  modules: LearningPathModule[]
  prerequisites: string[]
  coreCompetencies: string[]
  commonPitfalls: string[]
  sourceMetadata: {
    sourceType: 'uploaded_pdf' | 'class_lesson' | 'demo'
    sourceName: string
    materialId?: string
  }
}

export interface CriterionAnalysis {
  score: number
  status: 'Strong' | 'Satisfactory' | 'Needs Improvement' | 'Aligned' | 'Partially Aligned' | 'Insufficient Context'
  explanation: string
  levelsDetected?: string[]
}

export interface PriorityAction {
  priority: 'High' | 'Medium' | 'Low'
  issue: string
  recommendation: string
}

export interface LessonPlanQualityAnalysis {
  overallScore: number
  rating: 'Exemplary' | 'Strong' | 'Satisfactory' | 'Needs Improvement'
  summary: string
  criteria: {
    objectiveAlignment: CriterionAnalysis
    bloomsAlignment: CriterionAnalysis
    contentQuality: CriterionAnalysis
    pedagogicalQuality: CriterionAnalysis
    differentiation: CriterionAnalysis
    assessmentQuality: CriterionAnalysis
    timeFeasibility: CriterionAnalysis
    curriculumAlignment: CriterionAnalysis
  }
  strengths: string[]
  weaknesses: string[]
  missingElements: string[]
  improvementSuggestions: string[]
  priorityActions: PriorityAction[]
  overall?: number
  verdict?: string
  breakdown?: { label: string; score: number; explanation?: string }[]
  issues?: string[]
  improvements?: string[]
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
  description?: string
  learningObjectives?: string[]
  keyConcepts?: string[]
  points: string[]
  explanation?: string
  example: string
  examples?: string[]
  activities?: string[]
  practice: string
  practiceQuestions?: string[]
  supportStrategies?: string[]
  misconceptionsToAddress?: string[]
  challengeQuestions?: string[]
  extensionActivities?: string[]
  successCriteria?: string[]
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

export interface ClassTopicItem {
  id: string
  classId: string
  title: string
  order: number
  isActive: boolean
  createdAt?: string
}

export interface TeacherClassItem {
  id: string
  name: string
  classCode: string
  subject: string
  subjectCode?: string
  academicYear?: string
  department?: string
  section?: string
  description?: string
  studentCount: number
  topics?: ClassTopicItem[]
  createdAt?: string
}
