import { NextRequest, NextResponse } from 'next/server'
import {
  approveAdaptiveTrackService,
  generateAdaptiveTracksService,
} from '@/lib/services/adaptive-service'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const topic = body.topic || 'ER Model'

    if (body.action === 'approve') {
      const result = await approveAdaptiveTrackService(topic, body.level)
      return NextResponse.json(result)
    }

    const tracks = await generateAdaptiveTracksService(topic)
    return NextResponse.json({ success: true, tracks })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to generate adaptive tracks' },
      { status: 500 },
    )
  }
}
