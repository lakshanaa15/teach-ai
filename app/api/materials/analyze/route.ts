import { NextRequest, NextResponse } from 'next/server'
import { analyzeMaterialService } from '@/lib/services/material-service'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const topic = body.topic?.trim() || ''
    const materialName = body.materialName?.trim() || ''
    const content = body.content?.trim() || ''
    const subject = body.subject?.trim() || ''
    const grade = body.grade?.trim() || ''
    const curriculum = body.curriculum?.trim() || ''
    const materialId = body.materialId?.trim() || ''

    // Validate that at least some topic, title, or content was provided
    if (!topic && !materialName && !content) {
      return NextResponse.json(
        {
          success: false,
          error: 'Topic, material name, or content is required for AI material analysis.',
        },
        { status: 400 },
      )
    }

    const analysis = await analyzeMaterialService(
      materialName || topic,
      topic || materialName,
      {
        subject,
        grade,
        curriculum,
        content,
        materialId,
      },
    )

    return NextResponse.json({ success: true, analysis })
  } catch (error) {
    console.error('[MATERIAL ANALYSIS ERROR]:', error)
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to analyze educational material using Gemini AI.',
      },
      { status: 500 },
    )
  }
}
