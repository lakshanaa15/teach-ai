import { NextRequest, NextResponse } from 'next/server'
import { getAnalyticsOverviewService } from '@/lib/services/analytics-service'

export async function GET() {
  try {
    const analytics = await getAnalyticsOverviewService()
    return NextResponse.json({ success: true, analytics })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch analytics' },
      { status: 500 },
    )
  }
}
