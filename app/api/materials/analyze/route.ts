import { NextRequest, NextResponse } from 'next/server'
import { analyzeMaterialService } from '@/lib/services/material-service'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const topic = body.topic || 'ER Model'
    const materialNameOrContent = body.content || body.materialName || topic

    const analysis = await analyzeMaterialService(materialNameOrContent, topic)

    return NextResponse.json({ success: true, analysis })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to analyze material' },
      { status: 500 },
    )
  }
}
