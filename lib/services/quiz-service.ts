import { getPrisma } from '@/lib/db/prisma'
import {
  evaluateQuizSubmission as aiEvaluateQuiz,
  generateQuiz as aiGenerateQuiz,
  generateRecommendations as aiGenerateRecommendations,
} from '@/lib/ai-service'
import type { QuizQuestion, QuizSubmission, Recommendation } from '@/lib/types'

export async function generateQuizService(
  topic: string,
  count = 4,
  type: QuizQuestion['type'] = 'MCQ',
): Promise<QuizQuestion[]> {
  const questions = await aiGenerateQuiz(topic, count, type)

  const prisma = getPrisma()
  if (prisma) {
    try {
      const quiz = await prisma.quiz.create({
        data: {
          title: `${topic} Check Assessment`,
          topic,
          difficulty: 'Standard',
          questions: {
            create: questions.map((q) => ({
              type: q.type as any,
              question: q.question,
              options: q.options || [],
              answer: q.answer,
              explanation: q.explanation,
              concept: q.concept,
            })),
          },
        },
      })
    } catch (e) {
      console.warn('Prisma quiz creation fallback to in-memory:', e)
    }
  }

  return questions
}

export async function evaluateQuizSubmissionService(
  topic: string,
  answers: Record<number, string>,
  questions: QuizQuestion[],
  studentId = 's1',
): Promise<{ submission: QuizSubmission; recommendations: Recommendation[] }> {
  const submission = await aiEvaluateQuiz(topic, answers, questions)
  const recommendations = aiGenerateRecommendations(topic, submission.identifiedGaps)

  const prisma = getPrisma()
  if (prisma) {
    try {
      // Find or create quiz record and student record
      const student = await prisma.student.findFirst({
        where: { id: studentId },
      })

      if (student) {
        await prisma.quizSubmission.create({
          data: {
            quiz: {
              create: {
                title: `${topic} Check Quiz`,
                topic,
                difficulty: 'Standard',
              },
            },
            studentId: student.id,
            topic,
            score: submission.score,
            total: submission.total,
            percentage: submission.percentage,
            identifiedGaps: submission.identifiedGaps,
            conceptResults: {
              create: submission.conceptResults.map((cr) => ({
                concept: cr.concept,
                correct: cr.correct,
                feedback: cr.feedback,
              })),
            },
          },
        })

        // Update Topic Mastery
        await prisma.topicMastery.upsert({
          where: {
            studentId_topic: {
              studentId: student.id,
              topic,
            },
          },
          update: {
            mastery: submission.percentage,
          },
          create: {
            studentId: student.id,
            topic,
            mastery: submission.percentage,
          },
        })
      }
    } catch (e) {
      console.warn('Prisma submission save fallback:', e)
    }
  }

  return { submission, recommendations }
}
