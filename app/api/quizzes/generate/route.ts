import { NextRequest, NextResponse } from 'next/server'
import { generateQuizService } from '@/lib/services/quiz-service'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const topic = body.topic || 'ER Model'
    const count = Number(body.count) || 4
    const type = body.type || 'MCQ'

    const questions = await generateQuizService(topic, count, type)

    return NextResponse.json({ success: true, questions })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to generate quiz' },
      { status: 500 },
    )
  }
}
