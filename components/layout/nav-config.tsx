export type NavIconName =
  | 'dashboard'
  | 'materials'
  | 'lesson-plans'
  | 'adaptive'
  | 'simulation'
  | 'quizzes'
  | 'students'
  | 'analytics'
  | 'recommendations'
  | 'settings'
  | 'learning'
  | 'progress'
  | 'tutor'
  | 'profile'
  | 'brand'

export type NavItem = {
  label: string
  href: string
  icon: NavIconName
  highlight?: boolean
}

export const teacherNav: NavItem[] = [
  { label: 'Dashboard', href: '/teacher', icon: 'dashboard' },
  { label: 'Learning Materials', href: '/teacher/materials', icon: 'materials' },
  { label: 'Lesson Plans', href: '/teacher/lesson-plans', icon: 'lesson-plans', highlight: true },
  { label: 'Adaptive Learning', href: '/teacher/adaptive', icon: 'adaptive', highlight: true },
  { label: 'Student Simulation', href: '/teacher/simulation', icon: 'simulation', highlight: true },
  { label: 'Quizzes', href: '/teacher/quizzes', icon: 'quizzes' },
  { label: 'Students', href: '/teacher/students', icon: 'students' },
  { label: 'Analytics', href: '/teacher/analytics', icon: 'analytics' },
  { label: 'Recommendations', href: '/teacher/recommendations', icon: 'recommendations', highlight: true },
  { label: 'Settings', href: '/teacher/settings', icon: 'settings' },
]

export const studentNav: NavItem[] = [
  { label: 'Dashboard', href: '/student', icon: 'dashboard' },
  { label: 'My Learning', href: '/student/learning', icon: 'learning' },
  { label: 'Recommendations', href: '/student/recommendations', icon: 'recommendations' },
  { label: 'Quizzes', href: '/student/quizzes', icon: 'quizzes' },
  { label: 'Progress', href: '/student/progress', icon: 'progress' },
  { label: 'AI Tutor', href: '/student/tutor', icon: 'tutor' },
  { label: 'Profile', href: '/student/profile', icon: 'profile' },
]

export const brandIconName: NavIconName = 'brand'
