import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth/session'

import https from 'https'

interface ChatMessageInput {
  role: 'user' | 'assistant'
  content: string
}

const CANDIDATE_MODELS = [
  'gemini-3.6-flash',
  'gemini-3.7-flash',
  'gemini-3.5-flash-lite',
  'gemini-2.0-flash',
]

function makeGeminiRequest(url: string, payload: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url)
    const req = https.request(
      parsedUrl,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
        rejectUnauthorized: false, // Ensures compatibility with corporate/local proxies
      },
      (res) => {
        let data = ''
        res.on('data', (chunk) => {
          data += chunk
        })
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const parsed = JSON.parse(data)
              const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text
              if (text && text.trim()) {
                resolve(text.trim())
              } else {
                reject(new Error('Empty text content received from Gemini model candidate.'))
              }
            } catch (err) {
              reject(err)
            }
          } else {
            reject(new Error(`Gemini API error (${res.statusCode}): ${data}`))
          }
        })
      },
    )

    req.on('error', reject)
    req.setTimeout(15000, () => {
      req.destroy(new Error('Gemini API request timed out after 15 seconds.'))
    })
    req.write(payload)
    req.end()
  })
}

async function callGemini(
  apiKey: string,
  systemPrompt: string,
  history: ChatMessageInput[],
  currentPrompt: string,
): Promise<string> {
  const contents = []

  // Add conversation history
  for (const msg of history) {
    if (!msg.content?.trim()) continue
    contents.push({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content.trim() }],
    })
  }

  // Add current user prompt
  contents.push({
    role: 'user',
    parts: [{ text: currentPrompt.trim() }],
  })

  const payload = JSON.stringify({
    system_instruction: {
      parts: [{ text: systemPrompt }],
    },
    contents,
    generationConfig: {
      temperature: 0.7,
      topP: 0.95,
      maxOutputTokens: 1200,
    },
  })

  let lastError: Error | null = null

  for (const model of CANDIDATE_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
      const responseText = await makeGeminiRequest(url, payload)
      return responseText
    } catch (err) {
      console.warn(`[GEMINI API] Failed request to model ${model}:`, err instanceof Error ? err.message : String(err))
      lastError = err instanceof Error ? err : new Error(String(err))
    }
  }

  throw lastError || new Error('No valid response received from Gemini models.')
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession()
    const studentName = session?.name || 'Learner'

    const body = await req.json()
    const { prompt, level = 'Standard', topic = 'ER Model', history = [] } = body

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return NextResponse.json(
        { success: false, error: 'Prompt is required.' },
        { status: 400 },
      )
    }

    const apiKey = process.env.GEMINI_API_KEY?.trim()
    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error:
            'GEMINI_API_KEY is not configured in the server environment (.env). Please provide a valid Gemini API key to enable live AI responses.',
          isConfigError: true,
        },
        { status: 503 },
      )
    }

    // Build Socratic Tutor System Persona
    const systemPrompt = `You are the TeachAI Socratic Tutor, an expert, encouraging, and pedagogically sound AI teaching assistant.
You are tutoring a student named "${studentName}" on the subject/topic: "${topic}".
The student is currently learning at the "${level}" academic tier.

Core Pedagogical Instructions:
1. Socratic Method: Guide the student toward conceptual clarity with interactive questions, targeted hints, and step-by-step reasoning rather than merely dumping answers.
2. Tier Adaptation:
   - If level is Remedial: Use simple everyday analogies (e.g. comparing entities to nouns and relationships to verbs), break down complex concepts into small intuitive bites, and avoid unexplained technical jargon.
   - If level is Standard: Provide rigorous, curriculum-aligned explanations with formal notation, clear definitions, and worked step-by-step examples.
   - If level is Advanced: Provide deep conceptual insights, discuss edge cases, optimization trade-offs, formal mathematical/database theory, and challenge problems.
3. Tone & Style: Warm, patient, inspiring, and concise. Use clear markdown (bullet points, bold highlights, code or formula blocks where relevant).
4. Interactive Closure: End your response with a thought-provoking check for understanding, a follow-up question, or a mini practice problem to keep the dialogue active.`

    const reply = await callGemini(apiKey, systemPrompt, history, prompt)

    return NextResponse.json({
      success: true,
      reply,
      model: 'gemini',
    })
  } catch (error) {
    console.error('[TUTOR ROUTE ERROR]:', error)
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred while communicating with Gemini AI.',
      },
      { status: 500 },
    )
  }
}
