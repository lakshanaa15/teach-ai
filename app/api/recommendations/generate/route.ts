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
    const topic = body.topic || 'ER Model'
    const weakConcepts = body.weakConcepts || []

    const recommendations = await generateRecommendationsService(topic, weakConcepts)

    return NextResponse.json({ success: true, recommendations })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to generate recommendations' },
      { status: 500 },
    )
  }
}
