import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth/session'
import { getPrisma } from '@/lib/db/prisma'
import { generateQuizWithGemini, normalizeQuestionType } from '@/lib/gemini'

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
      curriculum,
      optionalSource,
      count,
      classId,
    } = body

    const questionCount = Number(count)
    if (!questionCount || isNaN(questionCount) || questionCount < 1) {
      return NextResponse.json(
        { success: false, error: 'No. of Questions must be a positive integer.' },
        { status: 400 },
      )
    }

    if (!subject?.trim()) {
      return NextResponse.json({ success: false, error: 'Subject is required.' }, { status: 400 })
    }
    if (!grade?.trim()) {
      return NextResponse.json({ success: false, error: 'Grade is required.' }, { status: 400 })
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
        { success: false, error: 'Curriculum/Board is required.' },
        { status: 400 },
      )
    }

    // Generate real Quiz using Gemini AI
    const { title, questions } = await generateQuizWithGemini({
      subject: subject.trim(),
      grade: grade.trim(),
      topic: topic.trim(),
      learningObjective: learningObjective.trim(),
      duration: duration.trim(),
      curriculum: curriculum.trim(),
      count: questionCount,
      optionalSource: optionalSource?.trim() || undefined,
    })

    // Save as DRAFT in Supabase PostgreSQL
    const createdQuiz = await prisma.quiz.create({
      data: {
        title: title || `${topic.trim()} Formative Check`,
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
          create: questions.map((q) => ({
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
        teacher: { include: { user: { select: { name: true, email: true } } } },
        class: { select: { id: true, name: true, classCode: true } },
      },
    })

    return NextResponse.json({
      success: true,
      quiz: createdQuiz,
    })
  } catch (error) {
    console.error('[QUIZ GENERATION ERROR]:', error)
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred during quiz generation.',
      },
      { status: 500 },
    )
  }
}
