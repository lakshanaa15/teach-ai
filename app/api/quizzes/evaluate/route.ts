import { NextRequest, NextResponse } from 'next/server'
import { evaluateQuizSubmissionService } from '@/lib/services/quiz-service'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const topic = body.topic || 'ER Model'
    const answers = body.answers || {}
    const questions = body.questions || []
    const studentId = body.studentId || 's1'

    const result = await evaluateQuizSubmissionService(topic, answers, questions, studentId)

    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to evaluate quiz submission' },
      { status: 500 },
    )
  }
}
