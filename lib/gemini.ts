import https from 'https'

const CANDIDATE_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3.6-flash',
  'gemini-3.7-flash',
]

export function getGeminiApiKey(): string {
  const key = process.env.GEMINI_API_KEY?.trim()
  if (!key) {
    throw new Error(
      'GEMINI_API_KEY is not configured in server environment (.env.local). Please set a valid Gemini API key.',
    )
  }
  return key
}

export function makeGeminiRequest(url: string, payload: string): Promise<string> {
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
                reject(new Error('Empty text content received from Gemini candidate.'))
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
    req.setTimeout(45000, () => {
      req.destroy(new Error('Gemini API request timed out after 45 seconds.'))
    })
    req.write(payload)
    req.end()
  })
}

export function extractJsonFromText<T = any>(raw: string): T {
  if (!raw || typeof raw !== 'string') {
    throw new Error('Received empty or invalid response from Gemini.')
  }

  // 1. Remove markdown code fences ```json ... ``` or ``` ... ```
  let clean = raw.replace(/```(?:json)?\s*([\s\S]*?)\s*```/gi, '$1').trim()

  // 2. Direct parse attempt
  try {
    return JSON.parse(clean)
  } catch {
    // 3. Extract JSON object substring
    const firstBrace = clean.indexOf('{')
    const lastBrace = clean.lastIndexOf('}')
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      let candidate = clean.slice(firstBrace, lastBrace + 1)
      try {
        return JSON.parse(candidate)
      } catch {
        // Fix trailing commas: e.g. [1, 2, ] -> [1, 2]
        candidate = candidate.replace(/,\s*([}\]])/g, '$1')
        try {
          return JSON.parse(candidate)
        } catch {
          // continue
        }
      }
    }

    // 4. Extract JSON array substring
    const firstBracket = clean.indexOf('[')
    const lastBracket = clean.lastIndexOf(']')
    if (firstBracket !== -1 && lastBracket > firstBracket) {
      let candidate = clean.slice(firstBracket, lastBracket + 1)
      try {
        return JSON.parse(candidate)
      } catch {
        candidate = candidate.replace(/,\s*([}\]])/g, '$1')
        try {
          return JSON.parse(candidate)
        } catch {
          // continue
        }
      }
    }

    console.error('[GEMINI-RAW-RESPONSE-DEBUG]:', raw.substring(0, 300) + '...')
    throw new Error('Failed to parse structured JSON response from Gemini.')
  }
}

export async function callGeminiModels(systemPrompt: string, userPrompt: string): Promise<string> {
  const apiKey = getGeminiApiKey()

  const payload = JSON.stringify({
    system_instruction: {
      parts: [{ text: systemPrompt }],
    },
    contents: [
      {
        role: 'user',
        parts: [{ text: userPrompt }],
      },
    ],
    generationConfig: {
      temperature: 0.7,
      topP: 0.95,
      maxOutputTokens: 4000,
      responseMimeType: 'application/json',
      response_mime_type: 'application/json',
    },
  })

  let lastError: Error | null = null

  for (const model of CANDIDATE_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
      const responseText = await makeGeminiRequest(url, payload)
      return responseText
    } catch (err) {
      console.warn(`[GEMINI API] Model ${model} request failed:`, err instanceof Error ? err.message : String(err))
      lastError = err instanceof Error ? err : new Error(String(err))
    }
  }

  throw lastError || new Error('All candidate Gemini models failed to respond.')
}

// -------------------------------------------------------------
// Lesson Plan Generator
// -------------------------------------------------------------
export interface LessonPlanInput {
  subject: string
  grade: string
  topic: string
  learningObjective: string
  duration: string
  curriculum: string
  optionalSource?: string
}

export interface GeneratedLessonPlanContent {
  lessonTitle: string
  subject: string
  grade: string
  topic: string
  learningObjectives: string[]
  prerequisites: string[]
  curriculumAlignment: string
  duration: string
  introduction: {
    durationMinutes: number
    hook: string
    priorKnowledgeCheck: string
  }
  mainConcepts: Array<{
    name: string
    explanation: string
    keyVocabulary: string[]
  }>
  teachingActivities: Array<{
    phase: string
    timeMinutes: number
    teacherActivity: string
    studentActivity: string
    differentiationNotes?: string
  }>
  workedExamples: Array<{
    title: string
    problem: string
    stepByStepSolution: string[]
  }>
  studentActivities: Array<{
    title: string
    type: 'Individual' | 'Pair' | 'Group'
    instructions: string
    differentiation: {
      remedial: string
      standard: string
      advanced: string
    }
  }>
  assessment: {
    formativeCheck: string[]
    exitTicketQuestions: Array<{
      question: string
      expectedAnswer: string
    }>
  }
  homework: {
    task: string
    extensionChallenge: string
  }
}

export async function generateLessonPlanWithGemini(
  input: LessonPlanInput,
): Promise<GeneratedLessonPlanContent> {
  const systemPrompt = `You are TeachAI Master Curriculum Designer, an expert pedagogical AI creating comprehensive, high-engagement lesson plans adhering to modern educational standards (Bloom's Taxonomy, Universal Design for Learning).

You must output STRICT JSON matching this exact structure:
{
  "lessonTitle": string,
  "subject": string,
  "grade": string,
  "topic": string,
  "learningObjectives": string[],
  "prerequisites": string[],
  "curriculumAlignment": string,
  "duration": string,
  "introduction": {
    "durationMinutes": number,
    "hook": string,
    "priorKnowledgeCheck": string
  },
  "mainConcepts": [
    { "name": string, "explanation": string, "keyVocabulary": string[] }
  ],
  "teachingActivities": [
    { "phase": string, "timeMinutes": number, "teacherActivity": string, "studentActivity": string, "differentiationNotes": string }
  ],
  "workedExamples": [
    { "title": string, "problem": string, "stepByStepSolution": string[] }
  ],
  "studentActivities": [
    {
      "title": string,
      "type": "Individual" | "Pair" | "Group",
      "instructions": string,
      "differentiation": {
        "remedial": string,
        "standard": string,
        "advanced": string
      }
    }
  ],
  "assessment": {
    "formativeCheck": string[],
    "exitTicketQuestions": [
      { "question": string, "expectedAnswer": string }
    ]
  },
  "homework": {
    "task": string,
    "extensionChallenge": string
  }
}`

  const userPrompt = `Create a complete, detailed, classroom-ready Lesson Plan for:
- Subject: ${input.subject}
- Grade: ${input.grade}
- Topic: ${input.topic}
- Learning Objective: ${input.learningObjective}
- Duration: ${input.duration}
- Curriculum/Board: ${input.curriculum}
${input.optionalSource ? `- Supporting Source / Context: ${input.optionalSource}` : ''}

Ensure all sections are comprehensive, rigorous, and explicitly differentiated for Remedial, Standard, and Advanced learners.`

  const rawJson = await callGeminiModels(systemPrompt, userPrompt)

  try {
    const parsed = extractJsonFromText<GeneratedLessonPlanContent>(rawJson)
    return parsed
  } catch (err) {
    console.error('[GEMINI-PARSE-ERROR] Raw text:', rawJson)
    throw new Error('Failed to parse structured JSON lesson plan from Gemini.')
  }
}

// -------------------------------------------------------------
// Quiz Generator
// -------------------------------------------------------------
export interface QuizGenerationInput {
  subject: string
  grade: string
  topic: string
  learningObjective: string
  duration: string
  curriculum: string
  count: number
  optionalSource?: string
}

export interface GeneratedQuizQuestion {
  question: string
  type: 'MCQ' | 'True/False' | 'Short Answer'
  options?: string[]
  answer: string
  explanation: string
  difficulty: 'Remedial' | 'Standard' | 'Advanced'
  marks: number
  concept: string
}

export function normalizeQuestionType(
  type?: string,
): any {
  if (!type) return 'MCQ'
  const t = String(type).trim().toLowerCase()
  if (t.includes('true') || t.includes('false')) return 'True_False'
  if (t.includes('short')) return 'Short_Answer'
  return 'MCQ'
}

export async function generateQuizWithGemini(
  input: QuizGenerationInput,
): Promise<{ title: string; questions: GeneratedQuizQuestion[] }> {
  const count = Math.max(1, Math.min(25, Number(input.count) || 4))

  const systemPrompt = `You are TeachAI Master Assessment Specialist, creating rigorous formative assessment quizzes.
You must output STRICT JSON with this structure:
{
  "title": string,
  "questions": [
    {
      "question": string,
      "type": "MCQ" | "True/False" | "Short Answer",
      "options": ["Option A", "Option B", "Option C", "Option D"], // Exactly 4 for MCQ, 2 for True/False, omit for Short Answer
      "answer": string, // MUST exactly match one of the options for MCQ/True/False
      "explanation": string, // Detailed pedagogical reason why this answer is correct and why common distractors are incorrect
      "difficulty": "Remedial" | "Standard" | "Advanced",
      "marks": number, // default 1 or 2
      "concept": string // specific core concept tested
    }
  ]
}

CRITICAL RULES:
1. You MUST generate EXACTLY ${count} questions in the "questions" array. No more, no less.
2. For "MCQ", provide 4 distinct, plausible options.
3. For "MCQ" and "True/False", the "answer" field MUST be identical to one of the choices in the "options" array.
4. Ensure questions directly align with the specified Subject, Grade, Topic, Learning Objective, and Board.`

  const userPrompt = `Generate a formative quiz with EXACTLY ${count} questions:
- Subject: ${input.subject}
- Grade: ${input.grade}
- Topic: ${input.topic}
- Learning Objective: ${input.learningObjective}
- Duration: ${input.duration}
- Curriculum/Board: ${input.curriculum}
- Required Question Count: ${count}
${input.optionalSource ? `- Supporting Source / Context: ${input.optionalSource}` : ''}`

  const rawJson = await callGeminiModels(systemPrompt, userPrompt)

  try {
    const parsed = extractJsonFromText<{ title?: string; questions?: GeneratedQuizQuestion[] }>(rawJson)

    const rawQuestions: GeneratedQuizQuestion[] = Array.isArray(parsed.questions)
      ? parsed.questions
      : []

    // Ensure exact count
    const questions: GeneratedQuizQuestion[] = rawQuestions.slice(0, count).map((q, idx) => ({
      question: q.question || `Question ${idx + 1} on ${input.topic}`,
      type: q.type === 'True/False' || q.type === 'Short Answer' ? q.type : 'MCQ',
      options:
        q.type === 'MCQ' && Array.isArray(q.options) && q.options.length >= 2
          ? q.options
          : q.type === 'True/False'
            ? ['True', 'False']
            : q.type === 'Short Answer'
              ? undefined
              : ['Option A', 'Option B', 'Option C', 'Option D'],
      answer: q.answer || (q.options ? q.options[0] : 'Correct Answer'),
      explanation: q.explanation || 'Explanation aligned with learning objective.',
      difficulty: q.difficulty === 'Remedial' || q.difficulty === 'Advanced' ? q.difficulty : 'Standard',
      marks: Number(q.marks) || 1,
      concept: q.concept || input.topic,
    }))

    const title = parsed.title || `${input.topic} — Assessment Check`
    return { title, questions }
  } catch (err) {
    console.error('[GEMINI-QUIZ-PARSE-ERROR] Raw text:', rawJson)
    throw new Error('Failed to parse structured JSON quiz questions from Gemini.')
  }
}

// -------------------------------------------------------------
// Combined Lesson Plan + Quiz Generator
// -------------------------------------------------------------
export interface CombinedGenerationInput {
  subject: string
  grade: string
  topic: string
  learningObjective: string
  duration: string
  curriculum: string
  noOfQuestions: number
  optionalSource?: string
}

export interface GeneratedLessonPlanAndQuiz {
  lessonPlan: GeneratedLessonPlanContent
  quiz: {
    title: string
    questions: GeneratedQuizQuestion[]
  }
}

export async function generateLessonPlanAndQuizWithGemini(
  input: CombinedGenerationInput,
): Promise<GeneratedLessonPlanAndQuiz> {
  const count = Math.max(1, Math.min(25, Number(input.noOfQuestions) || 4))

  const systemPrompt = `You are TeachAI Master Pedagogical and Assessment Specialist.
You must generate BOTH a comprehensive, high-engagement Lesson Plan AND an aligned Formative Assessment Quiz in a single, rigorous response.

You must output STRICT JSON with this exact structure:
{
  "lessonPlan": {
    "lessonTitle": string,
    "subject": string,
    "grade": string,
    "topic": string,
    "learningObjectives": string[],
    "prerequisites": string[],
    "curriculumAlignment": string,
    "duration": string,
    "introduction": {
      "durationMinutes": number,
      "hook": string,
      "priorKnowledgeCheck": string
    },
    "mainConcepts": [
      { "name": string, "explanation": string, "keyVocabulary": string[] }
    ],
    "teachingActivities": [
      { "phase": string, "timeMinutes": number, "teacherActivity": string, "studentActivity": string, "differentiationNotes": string }
    ],
    "workedExamples": [
      { "title": string, "problem": string, "stepByStepSolution": string[] }
    ],
    "studentActivities": [
      {
        "title": string,
        "type": "Individual" | "Pair" | "Group",
        "instructions": string,
        "differentiation": {
          "remedial": string,
          "standard": string,
          "advanced": string
        }
      }
    ],
    "assessment": {
      "formativeCheck": string[],
      "exitTicketQuestions": [
        { "question": string, "expectedAnswer": string }
      ]
    },
    "homework": {
      "task": string,
      "extensionChallenge": string
    }
  },
  "quiz": {
    "title": string,
    "questions": [
      {
        "question": string,
        "type": "MCQ" | "True/False" | "Short Answer",
        "options": ["Option A", "Option B", "Option C", "Option D"], // Exactly 4 for MCQ, 2 for True/False, omit for Short Answer
        "answer": string, // MUST match one of the options for MCQ/True/False
        "explanation": string, // Detailed pedagogical reason why this answer is correct and why distractors are incorrect
        "difficulty": "Remedial" | "Standard" | "Advanced",
        "marks": number, // 1 or 2
        "concept": string // core concept tested
      }
    ]
  }
}

CRITICAL RULES:
1. The "quiz.questions" array MUST contain EXACTLY ${count} questions. No more, no less.
2. For "MCQ", provide 4 distinct, plausible options.
3. For "MCQ" and "True/False", the "answer" field MUST be identical to one of the choices in the "options" array.
4. Ensure all lesson plan sections and quiz questions directly align with the specified Subject, Grade, Topic, Learning Objective, Duration, and Curriculum/Board.`

  const userPrompt = `Generate a complete Lesson Plan and aligned Quiz with EXACTLY ${count} questions for:
- Subject: ${input.subject}
- Grade / Class: ${input.grade}
- Topic: ${input.topic}
- Learning Objective: ${input.learningObjective}
- Duration: ${input.duration}
- Curriculum / Board: ${input.curriculum}
- Required Number of Quiz Questions: ${count}
${input.optionalSource ? `- Optional Source / Context Notes: ${input.optionalSource}` : ''}

Ensure the lesson plan is comprehensive and pedagogical, and the quiz has exactly ${count} questions mapped to the learning objectives.`

  const rawJson = await callGeminiModels(systemPrompt, userPrompt)

  try {
    const parsed = extractJsonFromText<any>(rawJson)

    const rawLP = parsed.lessonPlan || parsed
    const rawQuiz = parsed.quiz || { title: `${input.topic} Formative Check`, questions: [] }

    const rawQuestions: GeneratedQuizQuestion[] = Array.isArray(rawQuiz.questions)
      ? rawQuiz.questions
      : []

    const questions: GeneratedQuizQuestion[] = rawQuestions.slice(0, count).map((q, idx) => ({
      question: q.question || `Question ${idx + 1} on ${input.topic}`,
      type: q.type === 'True/False' || q.type === 'Short Answer' ? q.type : 'MCQ',
      options:
        q.type === 'MCQ' && Array.isArray(q.options) && q.options.length >= 2
          ? q.options
          : q.type === 'True/False'
            ? ['True', 'False']
            : q.type === 'Short Answer'
              ? undefined
              : ['Option A', 'Option B', 'Option C', 'Option D'],
      answer: q.answer || (q.options ? q.options[0] : 'Correct Answer'),
      explanation: q.explanation || 'Explanation aligned with learning objective.',
      difficulty: q.difficulty === 'Remedial' || q.difficulty === 'Advanced' ? q.difficulty : 'Standard',
      marks: Number(q.marks) || 1,
      concept: q.concept || input.topic,
    }))

    while (questions.length < count) {
      const idx = questions.length + 1
      questions.push({
        question: `Formative evaluation question ${idx} on ${input.topic}`,
        type: 'MCQ',
        options: ['Option A', 'Option B', 'Option C', 'Option D'],
        answer: 'Option A',
        explanation: `Assesses mastery of ${input.learningObjective}`,
        difficulty: 'Standard',
        marks: 1,
        concept: input.topic,
      })
    }

    const lessonPlan: GeneratedLessonPlanContent = {
      lessonTitle: rawLP.lessonTitle || `${input.topic} — Lesson Plan`,
      subject: input.subject,
      grade: input.grade,
      topic: input.topic,
      learningObjectives: Array.isArray(rawLP.learningObjectives) && rawLP.learningObjectives.length > 0
        ? rawLP.learningObjectives
        : [input.learningObjective],
      prerequisites: Array.isArray(rawLP.prerequisites) ? rawLP.prerequisites : [],
      curriculumAlignment: rawLP.curriculumAlignment || input.curriculum,
      duration: input.duration,
      introduction: rawLP.introduction || {
        durationMinutes: 5,
        hook: `Engaging introduction to ${input.topic}`,
        priorKnowledgeCheck: 'Review core prerequisites and key definitions',
      },
      mainConcepts: Array.isArray(rawLP.mainConcepts) && rawLP.mainConcepts.length > 0
        ? rawLP.mainConcepts
        : [{ name: input.topic, explanation: input.learningObjective, keyVocabulary: [] }],
      teachingActivities: Array.isArray(rawLP.teachingActivities) ? rawLP.teachingActivities : [],
      workedExamples: Array.isArray(rawLP.workedExamples) ? rawLP.workedExamples : [],
      studentActivities: Array.isArray(rawLP.studentActivities) ? rawLP.studentActivities : [],
      assessment: rawLP.assessment || { formativeCheck: [], exitTicketQuestions: [] },
      homework: rawLP.homework || { task: `Practice questions on ${input.topic}.`, extensionChallenge: '' },
    }

    const quiz = {
      title: rawQuiz.title || `${input.topic} — Formative Quiz`,
      questions,
    }

    return { lessonPlan, quiz }
  } catch (err) {
    console.error('[GEMINI-COMBINED-PARSE-ERROR] Raw text:', rawJson)
    throw new Error('Failed to parse structured JSON lesson plan and quiz from Gemini.')
  }
}

