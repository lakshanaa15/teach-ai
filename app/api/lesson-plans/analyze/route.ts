import { NextRequest, NextResponse } from 'next/server'
import { getPrisma } from '@/lib/db/prisma'
import { analyzeLessonPlanWithGemini } from '@/lib/gemini'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const lessonPlanId = body.lessonPlanId?.trim() || undefined
    const content = body.content
    const topic = body.topic?.trim() || ''
    const subject = body.subject?.trim() || 'General Subject'
    const grade = body.grade?.trim() || 'Standard Secondary'
    const learningObjective = body.learningObjective?.trim() || `Mastery of ${topic}`
    const duration = body.duration?.trim() || '45 minutes'
    const curriculum = body.curriculum?.trim() || 'Standard National Curriculum'
    let quizQuestions = Array.isArray(body.quizQuestions) ? body.quizQuestions : undefined

    if (!content || !topic) {
      return NextResponse.json(
        {
          success: false,
          error: 'Topic and lesson plan content are required for pedagogical quality analysis.',
        },
        { status: 400 },
      )
    }

    const prisma = getPrisma()
    let materialAnalysisContext: any = undefined

    if (prisma) {
      try {
        // Fetch Material Analysis context if available
        const analysisRec = await prisma.materialAnalysis.findFirst({
          where: { topic },
          orderBy: { createdAt: 'desc' },
        })

        if (analysisRec) {
          materialAnalysisContext = {
            coreConcepts: analysisRec.detectedConcepts || [],
            prerequisites: analysisRec.prerequisites || [],
            commonMisconceptions: analysisRec.commonMisconceptions || [],
            learningOutcomes: analysisRec.learningOutcomes || [],
          }
        }

        // Fetch associated Quiz if not provided in request
        if (!quizQuestions || quizQuestions.length === 0) {
          const quizRec = await prisma.quiz.findFirst({
            where: { topic },
            include: { questions: true },
            orderBy: { createdAt: 'desc' },
          })
          if (quizRec && quizRec.questions.length > 0) {
            quizQuestions = quizRec.questions
          }
        }
      } catch (dbErr) {
        console.warn('[LESSON-PLAN-ANALYZE] Context lookup warning:', dbErr)
      }
    }

    // Call real Google Gemini AI to analyze the lesson plan
    const analysis = await analyzeLessonPlanWithGemini({
      lessonPlanId,
      subject,
      grade,
      topic,
      learningObjective,
      duration,
      curriculum,
      lessonPlanContent: content,
      quizQuestions,
      materialAnalysisContext,
    })

    // Optionally persist analysis metadata inside the lesson plan JSON in PostgreSQL
    if (prisma && lessonPlanId) {
      try {
        const existing = await prisma.lessonPlan.findUnique({ where: { id: lessonPlanId } })
        if (existing && typeof existing.content === 'object' && existing.content !== null) {
          const updatedContent = {
            ...(existing.content as Record<string, any>),
            qualityAnalysis: analysis,
          }
          await prisma.lessonPlan.update({
            where: { id: lessonPlanId },
            data: { content: updatedContent as any },
          })
        }
      } catch (saveErr) {
        console.warn('[LESSON-PLAN-ANALYZE] Prisma update warning:', saveErr)
      }
    }

    return NextResponse.json({ success: true, analysis })
  } catch (error) {
    console.error('[LESSON PLAN QUALITY ANALYSIS ERROR]:', error)
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to analyze lesson plan using Gemini AI.',
      },
      { status: 500 },
    )
  }
}
