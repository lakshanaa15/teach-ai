import { NextRequest, NextResponse } from 'next/server'
import { listStudentsService } from '@/lib/services/analytics-service'

export async function GET() {
  try {
    const students = await listStudentsService()
    return NextResponse.json({ success: true, students })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch students list' },
      { status: 500 },
    )
  }
}
