import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth/session'
import { getPrisma } from '@/lib/db/prisma'
import { generateLessonPlanAndQuizWithGemini, normalizeQuestionType } from '@/lib/gemini'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session || session.role !== 'TEACHER') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Teacher authentication required.' },
        { status: 401 },
      )
    }

    const prisma = getPrisma()
    if (!prisma) {
      return NextResponse.json(
        { success: false, error: 'Database connection is unavailable.' },
        { status: 500 },
      )
    }

    // Resolve teacher record
    let teacher = await prisma.teacher.findFirst({
      where: { userId: session.userId },
    })

    if (!teacher) {
      teacher = await prisma.teacher.create({
        data: {
          userId: session.userId,
          institutionId: session.institutionId,
        },
      })
    }

    const body = await req.json()
    const {
      subject,
      grade,
      topic,
      learningObjective,
      duration,
      noOfQuestions,
      curriculum,
      optionalSource,
      classId,
    } = body

    // Validate required fields
    if (!subject?.trim()) {
      return NextResponse.json({ success: false, error: 'Subject is required.' }, { status: 400 })
    }
    if (!grade?.trim()) {
      return NextResponse.json({ success: false, error: 'Grade / Class is required.' }, { status: 400 })
    }
    if (!topic?.trim()) {
      return NextResponse.json({ success: false, error: 'Topic is required.' }, { status: 400 })
    }
    if (!learningObjective?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Learning Objective is required.' },
        { status: 400 },
      )
    }
    if (!duration?.trim()) {
      return NextResponse.json({ success: false, error: 'Duration is required.' }, { status: 400 })
    }
    if (!curriculum?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Curriculum / Board is required.' },
        { status: 400 },
      )
    }

    const questionCount = Math.max(1, Math.min(25, Number(noOfQuestions) || 4))

    // Call Real Gemini AI to generate BOTH Lesson Plan and aligned Quiz
    const { lessonPlan, quiz } = await generateLessonPlanAndQuizWithGemini({
      subject: subject.trim(),
      grade: grade.trim(),
      topic: topic.trim(),
      learningObjective: learningObjective.trim(),
      duration: duration.trim(),
      curriculum: curriculum.trim(),
      noOfQuestions: questionCount,
      optionalSource: optionalSource?.trim() || undefined,
    })

    // Save BOTH in Supabase PostgreSQL in a transaction
    const [createdPlan, createdQuiz] = await prisma.$transaction([
      prisma.lessonPlan.create({
        data: {
          title: lessonPlan.lessonTitle || `${topic.trim()} Lesson Plan`,
          subject: subject.trim(),
          grade: grade.trim(),
          topic: topic.trim(),
          learningObjective: learningObjective.trim(),
          duration: duration.trim(),
          curriculum: curriculum.trim(),
          source: optionalSource?.trim() || null,
          status: 'Draft',
          content: lessonPlan as any,
          teacherId: teacher.id,
          classId: classId?.trim() || null,
        },
        include: {
          teacher: {
            include: { user: { select: { name: true, email: true } } },
          },
          class: { select: { id: true, name: true, classCode: true } },
        },
      }),
      prisma.quiz.create({
        data: {
          title: quiz.title || `${topic.trim()} Formative Check`,
          subject: subject.trim(),
          grade: grade.trim(),
          topic: topic.trim(),
          learningObjective: learningObjective.trim(),
          duration: duration.trim(),
          curriculum: curriculum.trim(),
          source: optionalSource?.trim() || null,
          difficulty: 'Standard',
          status: 'Draft',
          teacherId: teacher.id,
          classId: classId?.trim() || null,
          questions: {
            create: quiz.questions.map((q) => ({
              type: normalizeQuestionType(q.type),
              question: q.question,
              options: q.options || [],
              answer: q.answer,
              explanation: q.explanation,
              concept: q.concept,
              difficulty: q.difficulty,
              marks: q.marks || 1,
            })),
          },
        },
        include: {
          questions: true,
          teacher: {
            include: { user: { select: { name: true, email: true } } },
          },
          class: { select: { id: true, name: true, classCode: true } },
        },
      }),
    ])

    return NextResponse.json({
      success: true,
      lessonPlan: createdPlan,
      quiz: createdQuiz,
    })
  } catch (error) {
    console.error('[LESSON PLAN & QUIZ GENERATION ERROR]:', error)
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred during Lesson Plan and Quiz generation.',
      },
      { status: 500 },
    )
  }
}
