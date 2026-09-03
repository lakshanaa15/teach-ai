import { NextRequest, NextResponse } from 'next/server'
import {
  approveAdaptiveTrackService,
  generateAdaptiveTracksService,
} from '@/lib/services/adaptive-service'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const topic = body.topic?.trim()

    if (body.action === 'approve') {
      if (!topic) {
        return NextResponse.json(
          { success: false, error: 'Topic is required for track approval.' },
          { status: 400 },
        )
      }
      const result = await approveAdaptiveTrackService(topic, body.level)
      return NextResponse.json(result)
    }

    // Validate that topic is provided
    if (!topic) {
      return NextResponse.json(
        {
          success: false,
          error: 'Topic is required to generate differentiated adaptive learning tracks.',
        },
        { status: 400 },
      )
    }

    const tracks = await generateAdaptiveTracksService(topic, {
      subject: body.subject?.trim(),
      grade: body.grade?.trim(),
      curriculum: body.curriculum?.trim(),
      learningObjective: body.learningObjective?.trim(),
      studentId: body.studentId?.trim(),
      classId: body.classId?.trim(),
      materialId: body.materialId?.trim(),
    })

    return NextResponse.json({ success: true, tracks })
  } catch (error) {
    console.error('[ADAPTIVE GENERATION ERROR]:', error)
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to generate 3-tier adaptive tracks using Gemini AI.',
      },
      { status: 500 },
    )
  }
}
