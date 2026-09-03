import { NextRequest, NextResponse } from 'next/server'
import {
  generateRecommendationsService,
  listRecommendationsService,
} from '@/lib/services/recommendation-service'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const studentId = searchParams.get('studentId') || undefined
    const recommendations = await listRecommendationsService(studentId)

    return NextResponse.json({ success: true, recommendations })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to list recommendations' },
      { status: 500 },
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const topic = body.topic?.trim() || ''

    if (!topic) {
      return NextResponse.json(
        {
          success: false,
          error: 'Topic is required to generate diagnostic recommendations.',
        },
        { status: 400 },
      )
    }

    const studentId = body.studentId?.trim() || undefined
    const classId = body.classId?.trim() || undefined
    const weakConcepts = Array.isArray(body.weakConcepts) ? body.weakConcepts : undefined
    const subject = body.subject?.trim() || undefined
    const grade = body.grade?.trim() || undefined
    const learningObjective = body.learningObjective?.trim() || undefined
    const curriculum = body.curriculum?.trim() || undefined

    const result = await generateRecommendationsService({
      topic,
      studentId,
      classId,
      weakConcepts,
      subject,
      grade,
      learningObjective,
      curriculum,
    })

    return NextResponse.json({
      success: true,
      diagnosticReport: result.diagnosticReport,
      recommendations: result.recommendations,
    })
  } catch (error) {
    console.error('[DIAGNOSTIC-RECOMMENDATIONS-GENERATE-ERROR]:', error)
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to generate diagnostic recommendations using Gemini AI.',
      },
      { status: 500 },
    )
  }
}
