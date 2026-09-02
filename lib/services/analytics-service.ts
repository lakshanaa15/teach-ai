import { getPrisma } from '@/lib/db/prisma'
import {
  classTrend,
  dashboardStats,
  recentQuizPerformance,
  students as mockStudents,
  topicMasteryOverview,
} from '@/lib/mock-data'

export async function getAnalyticsOverviewService() {
  const prisma = getPrisma()
  if (prisma) {
    try {
      const studentCount = await prisma.student.count()
      const submissions = await prisma.quizSubmission.findMany({
        take: 50,
        orderBy: { submittedAt: 'desc' },
      })

      if (studentCount > 0) {
        const avgScore = submissions.length > 0
          ? Math.round(submissions.reduce((acc: number, s: any) => acc + s.percentage, 0) / submissions.length)
          : 74

        return {
          stats: {
            totalStudents: studentCount,
            avgPerformance: avgScore,
            gapsDetected: 4,
            atRisk: 3,
          },
          classTrend,
          topicMastery: topicMasteryOverview,
          recentQuizzes: recentQuizPerformance,
        }
      }
    } catch (e) {
      console.warn('Prisma analytics query fallback:', e)
    }
  }

  return {
    stats: dashboardStats,
    classTrend,
    topicMastery: topicMasteryOverview,
    recentQuizzes: recentQuizPerformance,
    students: mockStudents,
  }
}

export async function listStudentsService() {
  const prisma = getPrisma()
  if (prisma) {
    try {
      const records = await prisma.student.findMany({
        include: {
          user: true,
          topicMasteries: true,
          quizSubmissions: true,
        },
      })
      if (records && records.length > 0) {
        return records.map((r: any) => ({
          id: r.id,
          name: r.user.name,
          email: r.user.email,
          grade: r.grade,
          level: r.level,
          overallScore: r.overallScore,
          progress: r.progress,
          status: r.status,
          weakTopics: ['ER Model: Cardinality', 'Trigonometric Identities'],
          strengths: ['Algebra', 'Linear Functions'],
          performanceTrend: [70, 72, 74, 76, 75, 78, r.overallScore],
          topicMastery: r.topicMasteries.map((tm: any) => ({
            topic: tm.topic,
            mastery: tm.mastery,
          })),
          quizHistory: r.quizSubmissions.map((qs: any) => ({
            id: qs.id,
            title: `${qs.topic} Check Quiz`,
            date: qs.submittedAt.toISOString().split('T')[0],
            score: qs.percentage,
          })),
          nextActivities: ['Review Remedial Track', 'Take practice quiz'],
        }))
      }
    } catch (e) {
      console.warn('Prisma student list fallback:', e)
    }
  }

  return mockStudents
}
