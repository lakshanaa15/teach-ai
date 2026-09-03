export type NavIconName =
  | 'dashboard'
  | 'classes'
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
  { label: 'Classes', href: '/teacher/classes', icon: 'classes' },
  { label: 'Lesson Plans', href: '/teacher/lesson-plans', icon: 'lesson-plans', highlight: true },
  { label: 'Quizzes', href: '/teacher/quizzes', icon: 'quizzes' },
  { label: 'Students', href: '/teacher/students', icon: 'students' },
  { label: 'Learning Materials', href: '/teacher/materials', icon: 'materials' },
  { label: 'Adaptive Learning', href: '/teacher/adaptive', icon: 'adaptive', highlight: true },
  { label: 'Student Simulation', href: '/teacher/simulation', icon: 'simulation' },
  { label: 'Analytics', href: '/teacher/analytics', icon: 'analytics' },
  { label: 'Recommendations', href: '/teacher/recommendations', icon: 'recommendations' },
  { label: 'Settings', href: '/teacher/settings', icon: 'settings' },
]

export const studentNav: NavItem[] = [
  { label: 'Dashboard', href: '/student', icon: 'dashboard' },
  { label: 'My Learning', href: '/student/learning', icon: 'learning' },
  { label: 'Quizzes', href: '/student/quizzes', icon: 'quizzes' },
  { label: 'Progress', href: '/student/progress', icon: 'progress' },
  { label: 'Recommendations', href: '/student/recommendations', icon: 'recommendations' },
  { label: 'AI Tutor', href: '/student/tutor', icon: 'tutor' },
  { label: 'Profile', href: '/student/profile', icon: 'profile' },
]

export const brandIconName: NavIconName = 'brand'
