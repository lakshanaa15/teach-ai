import https from 'https'
import type {
  StudentSimulationResult,
  CourseLearningPath,
  SimulatedStudent,
  LessonAnalysis,
} from '@/lib/types'

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

export async function callGeminiWithInlineData(
  systemPrompt: string,
  userPrompt: string,
  inlineData: { mimeType: string; data: string },
): Promise<string> {
  const apiKey = getGeminiApiKey()

  const payload = JSON.stringify({
    system_instruction: {
      parts: [{ text: systemPrompt }],
    },
    contents: [
      {
        role: 'user',
        parts: [
          {
            inlineData: {
              mimeType: inlineData.mimeType,
              data: inlineData.data,
            },
          },
          { text: userPrompt },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 8000,
    },
  })

  let lastError: Error | null = null

  for (const model of CANDIDATE_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
      const responseText = await makeGeminiRequest(url, payload)
      return responseText
    } catch (err) {
      console.warn(`[GEMINI API INLINE] Model ${model} request failed:`, err instanceof Error ? err.message : String(err))
      lastError = err instanceof Error ? err : new Error(String(err))
    }
  }

  throw lastError || new Error('All candidate Gemini models failed to process inline document.')
}

export async function detectSubjectAndTopicWithGemini(
  contentSnippet: string,
  fileName?: string,
): Promise<{ subject: string; topic: string }> {
  const cleanSnippet = contentSnippet.trim()
  if (!cleanSnippet && (!fileName || fileName.trim() === '')) {
    return { subject: 'General Course', topic: 'General Topic' }
  }

  const systemPrompt = `You are TeachAI Academic Classifier. Analyze the provided educational text and file name to identify the primary academic subject and specific topic.
Output STRICT JSON:
{
  "subject": string,
  "topic": string
}
Rules:
1. "subject" must be a standard academic discipline (e.g., "Biology", "Physics", "Computer Science", "Mathematics", "Chemistry", "Economics", "History", etc.).
2. "topic" must be the specific unit/topic title (e.g., "Photosynthesis", "Newton's Laws of Motion", "Python Programming", "Trigonometric Identities", "Microeconomics", etc.).
3. Base your classification strictly on the provided text. Do not default to Database Management Systems unless the text is actually about databases.`

  const userPrompt = `File Name: ${fileName || 'Uploaded Document'}
Content Preview:
${cleanSnippet.slice(0, 3000)}

Identify the academic subject and specific topic in strict JSON.`

  try {
    const rawJson = await callGeminiModels(systemPrompt, userPrompt)
    const parsed = extractJsonFromText<{ subject?: string; topic?: string }>(rawJson)
    return {
      subject: parsed.subject?.trim() || 'General Course',
      topic: parsed.topic?.trim() || fileName?.replace(/\.pdf$/i, '') || 'Uploaded Topic',
    }
  } catch (err) {
    console.warn('[GEMINI-CLASSIFICATION-FALLBACK]:', err)
    return {
      subject: 'General Course',
      topic: fileName?.replace(/\.pdf$/i, '') || 'Uploaded Topic',
    }
  }
}

// -------------------------------------------------------------
// Student Simulation Engine
// -------------------------------------------------------------
export interface StudentSimulationInput {
  lessonTitle: string
  subject: string
  topic: string
  sourceType: 'uploaded_pdf' | 'class_lesson' | 'demo'
  sourceName: string
  sourceContent: string
  learningObjectives?: string
}

export async function generateStudentSimulationWithGemini(
  input: StudentSimulationInput,
): Promise<StudentSimulationResult> {
  const systemPrompt = `You are TeachAI Student Cognitive Simulation Engine, an expert at stress-testing pedagogical lesson plans against realistic student personas before a teacher delivers the class.

You must output STRICT JSON matching this exact structure:
{
  "students": [
    {
      "profile": "Struggling Student",
      "understanding": number (between 25 and 55),
      "response": string (first-person quotation from the struggling student showing where and why they got confused with specific terms/concepts from this lesson),
      "confusionPoints": string[] (2-3 specific conceptual sticking points from THIS lesson),
      "misconceptions": string[] (1-3 common cognitive errors or flawed assumptions about THIS lesson)
    },
    {
      "profile": "Average Student",
      "understanding": number (between 65 and 80),
      "response": string (first-person quotation showing solid baseline comprehension but hesitation on application/multi-step problems from THIS lesson),
      "confusionPoints": string[] (1-2 nuances or application friction points),
      "misconceptions": string[] (0-2 minor procedural slips)
    },
    {
      "profile": "Advanced Student",
      "understanding": number (between 88 and 98),
      "response": string (first-person quotation demonstrating complete mastery, asking deep extension questions or relating to real-world edge cases from THIS lesson),
      "confusionPoints": string[] (advanced inquiries or desires for deeper proof/applications),
      "misconceptions": []
    }
  ],
  "analysis": {
    "effectiveness": number (overall effectiveness score between 65 and 90),
    "engagement": number (predicted student engagement score between 65 and 90),
    "confusingSections": string[] (2-4 specific sections or explanations in THIS lesson that need more clarity),
    "misconceptions": string[] (2-4 recurring cognitive misconceptions students will encounter),
    "improvements": string[] (3-5 concrete, actionable teaching improvements such as visual analogies, scaffolding steps, formative checks)
  }
}

CRITICAL RULES:
1. The simulation must be derived ENTIRELY from the provided SOURCE LESSON MATERIAL.
2. If the lesson is about Photosynthesis, the students MUST talk about chlorophyll, light reactions, stomata, ATP/NADPH, Calvin cycle, etc.
3. If the lesson is about Physics / Newton's Laws, the students MUST talk about inertia, force, acceleration, friction, action-reaction, etc.
4. If the lesson is about Python, the students MUST talk about syntax, loops, data types, indentation, functions, etc.
5. NEVER mention Database Management Systems, ER Model, SQL, or Tables unless the uploaded source material is explicitly about databases!
6. All quotes, confusion points, misconceptions, and improvement suggestions must cite and address the actual concepts in the source material.`

  const userPrompt = `Analyze the following lesson plan source material and simulate student reactions:
- Lesson Title: ${input.lessonTitle}
- Subject: ${input.subject}
- Topic: ${input.topic}
- Source Document: ${input.sourceName} (${input.sourceType})
${input.learningObjectives ? `- Target Learning Objectives: ${input.learningObjectives}\n` : ''}
--- BEGIN SOURCE LESSON CONTENT ---
${input.sourceContent.slice(0, 15000)}
--- END SOURCE LESSON CONTENT ---

Generate the 3 student personas and pedagogical lesson effectiveness analysis in strict JSON format.`

  const rawJson = await callGeminiModels(systemPrompt, userPrompt)
  const parsed = extractJsonFromText<any>(rawJson)

  const sanitizeStudents = (arr: any[]): SimulatedStudent[] => {
    if (!Array.isArray(arr) || arr.length === 0) {
      return [
        {
          profile: 'Struggling Student',
          understanding: 42,
          response: `"I am struggling to connect the foundational definitions in ${input.topic} to the practical examples."`,
          confusionPoints: [`Core concept application in ${input.topic}`],
          misconceptions: [`Misinterpreting foundational terminology in ${input.topic}`],
        },
        {
          profile: 'Average Student',
          understanding: 72,
          response: `"The introductory explanations in ${input.topic} made sense, but the multi-step exercise was challenging."`,
          confusionPoints: [`Transitioning between steps in ${input.topic}`],
          misconceptions: [],
        },
        {
          profile: 'Advanced Student',
          understanding: 94,
          response: `"The core principles of ${input.topic} are clear. I'd like to explore advanced real-world applications."`,
          confusionPoints: [`Desire for challenging extension problems`],
          misconceptions: [],
        },
      ]
    }

    return arr.map((s: any) => ({
      profile: (s.profile || 'Average Student') as SimulatedStudent['profile'],
      understanding: typeof s.understanding === 'number' ? s.understanding : 70,
      response: typeof s.response === 'string' ? s.response : `Studying ${input.topic}`,
      confusionPoints: Array.isArray(s.confusionPoints) ? s.confusionPoints.map(String) : [],
      misconceptions: Array.isArray(s.misconceptions) ? s.misconceptions.map(String) : [],
    }))
  }

  const analysis: LessonAnalysis = {
    effectiveness: typeof parsed.analysis?.effectiveness === 'number' ? parsed.analysis.effectiveness : 82,
    engagement: typeof parsed.analysis?.engagement === 'number' ? parsed.analysis.engagement : 78,
    confusingSections: Array.isArray(parsed.analysis?.confusingSections)
      ? parsed.analysis.confusingSections.map(String)
      : [`Transition between theory and practice in ${input.topic}`],
    misconceptions: Array.isArray(parsed.analysis?.misconceptions)
      ? parsed.analysis.misconceptions.map(String)
      : [`Procedural confusion in ${input.topic}`],
    improvements: Array.isArray(parsed.analysis?.improvements)
      ? parsed.analysis.improvements.map(String)
      : [`Add visual analogies for ${input.topic}`, `Include a formative check midway through the lesson`],
  }

  return {
    students: sanitizeStudents(parsed.students),
    analysis,
    sourceMetadata: {
      sourceType: input.sourceType,
      sourceName: input.sourceName,
      subject: input.subject,
      topic: input.topic,
      charCount: input.sourceContent.length,
    },
  }
}

// -------------------------------------------------------------
// Course Learning Path Generator
// -------------------------------------------------------------
export interface CourseLearningPathInput {
  courseTitle: string
  subject?: string
  targetAudience?: string
  sourceType: 'uploaded_pdf' | 'class_lesson' | 'demo'
  sourceName: string
  sourceContent: string
  materialId?: string
}

export async function generateCourseLearningPathWithGemini(
  input: CourseLearningPathInput,
): Promise<CourseLearningPath> {
  const systemPrompt = `You are TeachAI Master Curriculum Architect. Analyze the provided educational document and design a structured, rigorous, sequential Course Learning Path.

You must output STRICT JSON matching this exact structure:
{
  "courseTitle": string,
  "subject": string,
  "targetAudience": string,
  "overview": string,
  "totalDurationWeeks": number,
  "modules": [
    {
      "moduleNumber": number,
      "title": string,
      "description": string,
      "estimatedHours": number,
      "keyConcepts": string[],
      "learningOutcomes": string[],
      "assessmentType": string
    }
  ],
  "prerequisites": string[],
  "coreCompetencies": string[],
  "commonPitfalls": string[]
}

CRITICAL RULES:
1. Extract and sequence 3 to 6 logical learning modules directly from the provided source document.
2. If the document is about Python Programming, the modules must be Python modules (e.g. Module 1: Python Basics & Environment, Module 2: Data Structures & Control Flow, Module 3: Functions & Modules, Module 4: OOP in Python).
3. If the document is about Biology / Photosynthesis, the modules must be Biological modules.
4. If the document is about Physics / Mechanics, the modules must be Physics modules.
5. NEVER output Database Management Systems or SQL modules unless the document is explicitly about DBMS.
6. Every module must have granular keyConcepts and Bloom's taxonomy learningOutcomes.
7. The learning path must reflect the authentic pedagogical structure of the provided material.`

  const userPrompt = `Analyze the following uploaded course material and construct a structured Course Learning Path:
- Proposed Title: ${input.courseTitle}
- Subject: ${input.subject || 'Academic Course'}
- Source Document: ${input.sourceName} (${input.sourceType})
--- BEGIN UPLOADED COURSE MATERIAL ---
${input.sourceContent.slice(0, 15000)}
--- END UPLOADED COURSE MATERIAL ---

Generate the complete structured Course Learning Path in strict JSON format.`

  const rawJson = await callGeminiModels(systemPrompt, userPrompt)
  const parsed = extractJsonFromText<any>(rawJson)

  const modules = Array.isArray(parsed.modules)
    ? parsed.modules.map((m: any, idx: number) => ({
        moduleNumber: typeof m.moduleNumber === 'number' ? m.moduleNumber : idx + 1,
        title: typeof m.title === 'string' ? m.title : `Module ${idx + 1}`,
        description: typeof m.description === 'string' ? m.description : `Study of unit ${idx + 1}`,
        estimatedHours: typeof m.estimatedHours === 'number' ? m.estimatedHours : 6,
        keyConcepts: Array.isArray(m.keyConcepts) ? m.keyConcepts.map(String) : [],
        learningOutcomes: Array.isArray(m.learningOutcomes) ? m.learningOutcomes.map(String) : [],
        assessmentType: typeof m.assessmentType === 'string' ? m.assessmentType : 'Formative Quiz',
      }))
    : [
        {
          moduleNumber: 1,
          title: `Foundations of ${input.courseTitle}`,
          description: `Core principles and fundamental terminology.`,
          estimatedHours: 4,
          keyConcepts: [`Introduction to ${input.courseTitle}`],
          learningOutcomes: [`Explain core definitions in ${input.courseTitle}`],
          assessmentType: 'Diagnostic Quiz',
        },
      ]

  return {
    courseTitle: typeof parsed.courseTitle === 'string' ? parsed.courseTitle : input.courseTitle,
    subject: typeof parsed.subject === 'string' ? parsed.subject : input.subject || 'General Course',
    targetAudience: typeof parsed.targetAudience === 'string' ? parsed.targetAudience : 'Undergraduate / Secondary Learners',
    overview: typeof parsed.overview === 'string' ? parsed.overview : `Sequential learning curriculum for ${input.courseTitle}.`,
    totalDurationWeeks: typeof parsed.totalDurationWeeks === 'number' ? parsed.totalDurationWeeks : Math.max(modules.length * 2, 4),
    modules,
    prerequisites: Array.isArray(parsed.prerequisites) ? parsed.prerequisites.map(String) : [],
    coreCompetencies: Array.isArray(parsed.coreCompetencies) ? parsed.coreCompetencies.map(String) : [],
    commonPitfalls: Array.isArray(parsed.commonPitfalls) ? parsed.commonPitfalls.map(String) : [],
    sourceMetadata: {
      sourceType: input.sourceType,
      sourceName: input.sourceName,
      materialId: input.materialId,
    },
  }
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

// -------------------------------------------------------------
// Material Analysis & Syllabus Concept Extractor
// -------------------------------------------------------------
export interface MaterialAnalysisInput {
  subject?: string
  grade?: string
  topic?: string
  curriculum?: string
  materialName?: string
  content?: string
}

export interface GeneratedMaterialAnalysis {
  title: string
  summary: string
  coreConcepts: string[]
  subConcepts: string[]
  prerequisites: string[]
  learningOutcomes: string[]
  commonMisconceptions: string[]
  importantTopics: string[]
  suggestedLessonTopics: string[]
  difficulty?: 'Remedial' | 'Standard' | 'Advanced'
}

export async function analyzeMaterialWithGemini(
  input: MaterialAnalysisInput,
): Promise<GeneratedMaterialAnalysis> {
  const systemPrompt = `You are TeachAI Master Curriculum & Syllabus Pedagogical Analyst, an expert at decomposing academic textbooks, lecture materials, and course syllabi into structured educational knowledge graphs.

You must output STRICT JSON matching this exact structure:
{
  "title": string,
  "summary": string,
  "coreConcepts": string[],
  "subConcepts": string[],
  "prerequisites": string[],
  "learningOutcomes": string[],
  "commonMisconceptions": string[],
  "importantTopics": string[],
  "suggestedLessonTopics": string[]
}

CRITICAL RULES:
1. Extract rich, rigorous, pedagogically actionable concepts directly from the provided educational material and metadata.
2. Provide at least 5-8 distinct "coreConcepts" and 4-8 granular "subConcepts".
3. Identify 3-6 essential "prerequisites" required before studying this material.
4. Define 4-6 specific, measurable "learningOutcomes" (adhering to Bloom's Taxonomy).
5. Highlight 3-5 "commonMisconceptions" or conceptual pitfalls students often encounter with this material.
6. Provide 3-6 "importantTopics" and 3-6 sequenced "suggestedLessonTopics" that can directly form lesson plans.
7. The output must be dynamically tailored to the specific subject, topic, and material provided. Do not use generic placeholders.`

  const userPrompt = `Perform a comprehensive pedagogical syllabus analysis and concept extraction on the following educational material:
- Subject: ${input.subject || 'Academic Course'}
- Grade / Level: ${input.grade || 'Standard Secondary / Undergraduate'}
- Primary Topic: ${input.topic || input.materialName || 'Course Unit'}
- Curriculum / Board: ${input.curriculum || 'Standard National Curriculum'}
- Material Document Name: ${input.materialName || 'Curriculum Syllabus / Lecture Notes'}
${input.content ? `\n--- Extracted Material Content ---\n${input.content.slice(0, 15000)}\n--- End Material Content ---` : ''}

Generate the complete structured pedagogical breakdown in strict JSON format.`

  const rawJson = await callGeminiModels(systemPrompt, userPrompt)

  try {
    const parsed = extractJsonFromText<Partial<GeneratedMaterialAnalysis>>(rawJson)

    const sanitizeArray = (arr: any, fallback: string[] = []): string[] => {
      if (Array.isArray(arr)) {
        const cleaned = arr.map((item) => String(item).trim()).filter(Boolean)
        if (cleaned.length > 0) return cleaned
      }
      return fallback
    }

    const title =
      typeof parsed.title === 'string' && parsed.title.trim()
        ? parsed.title.trim()
        : `${input.topic || input.materialName || 'Curriculum Material'} — Syllabus Analysis`

    const summary =
      typeof parsed.summary === 'string' && parsed.summary.trim()
        ? parsed.summary.trim()
        : `Pedagogical analysis and conceptual structure for ${input.topic || input.subject || 'this material'}.`

    const coreConcepts = sanitizeArray(parsed.coreConcepts, [
      `${input.topic || 'Core Concept'} Fundamentals`,
      `Key Principles of ${input.topic || input.subject || 'the Subject'}`,
    ])

    const subConcepts = sanitizeArray(parsed.subConcepts, [
      `Component classifications and notation`,
      `Practical problem-solving applications`,
    ])

    const prerequisites = sanitizeArray(parsed.prerequisites, [
      `Foundational prerequisite knowledge in ${input.subject || 'the field'}`,
    ])

    const learningOutcomes = sanitizeArray(parsed.learningOutcomes, [
      `Define and explain key concepts in ${input.topic || input.subject || 'the topic'}`,
      `Apply core principles to solve domain-specific problems`,
    ])

    const commonMisconceptions = sanitizeArray(parsed.commonMisconceptions, [
      `Confusing foundational definitions with advanced operational rules`,
    ])

    const importantTopics = sanitizeArray(parsed.importantTopics, [
      `${input.topic || 'Core Unit'} Theory & Definitions`,
      `Practical Modeling & Analysis`,
    ])

    const suggestedLessonTopics = sanitizeArray(parsed.suggestedLessonTopics, [
      `Introduction to ${input.topic || 'the Topic'}`,
      `Deep Dive into ${coreConcepts[0] || 'Core Concepts'}`,
      `Hands-on Practice & Assessment Review`,
    ])

    return {
      title,
      summary,
      coreConcepts,
      subConcepts,
      prerequisites,
      learningOutcomes,
      commonMisconceptions,
      importantTopics,
      suggestedLessonTopics,
      difficulty: 'Standard',
    }
  } catch (err) {
    console.error('[GEMINI-MATERIAL-ANALYSIS-PARSE-ERROR] Raw text:', rawJson)
    throw new Error('Failed to parse structured JSON material analysis from Gemini.')
  }
}

// -------------------------------------------------------------
// 3-Tier Adaptive Learning Generator (Remedial, Standard, Advanced)
// -------------------------------------------------------------
import type { AdaptiveTrack } from './types'

export interface AdaptiveGenerationInput {
  topic: string
  subject?: string
  grade?: string
  curriculum?: string
  learningObjective?: string
  materialAnalysisContext?: {
    coreConcepts?: string[]
    subConcepts?: string[]
    prerequisites?: string[]
    commonMisconceptions?: string[]
    learningOutcomes?: string[]
    importantTopics?: string[]
  }
  studentPerformanceContext?: {
    studentName?: string
    masteryLevel?: number // 0-100
    overallTier?: string // 'Remedial' | 'Standard' | 'Advanced'
    weakConcepts?: string[]
    strongConcepts?: string[]
    recentQuizScores?: number[]
    recentMistakesFeedback?: string[]
  }
}

export async function generateAdaptiveTracksWithGemini(
  input: AdaptiveGenerationInput,
): Promise<AdaptiveTrack[]> {
  const systemPrompt = `You are TeachAI Master Adaptive Learning & Differentiated Instruction Specialist, creating curriculum-aligned multi-tiered instructional learning tracks.

You must generate all THREE distinct instructional tiers: Remedial, Standard, and Advanced.
Output STRICT JSON matching this exact structure:
{
  "topic": string,
  "overallObjective": string,
  "tiers": {
    "remedial": {
      "level": "Remedial",
      "description": string,
      "learningObjectives": string[],
      "keyConcepts": string[],
      "explanation": string,
      "examples": string[],
      "activities": string[],
      "practiceQuestions": string[],
      "supportStrategies": string[],
      "misconceptionsToAddress": string[],
      "successCriteria": string[]
    },
    "standard": {
      "level": "Standard",
      "description": string,
      "learningObjectives": string[],
      "keyConcepts": string[],
      "explanation": string,
      "examples": string[],
      "activities": string[],
      "practiceQuestions": string[],
      "successCriteria": string[]
    },
    "advanced": {
      "level": "Advanced",
      "description": string,
      "learningObjectives": string[],
      "keyConcepts": string[],
      "explanation": string,
      "examples": string[],
      "activities": string[],
      "challengeQuestions": string[],
      "extensionActivities": string[],
      "successCriteria": string[]
    }
  }
}

CRITICAL PEDAGOGICAL DIFFERENTIATION RULES:
1. REMEDIAL TIER: Designed for struggling students.
   - Deconstruct complex ideas into small, intuitive steps.
   - Use concrete everyday physical analogies.
   - Directly target common misconceptions and identified student weak concepts.
   - Include worked step-by-step demonstration models with explicit scaffolding.
   - Provide practice questions with helpful hint guidance.

2. STANDARD TIER: Grade-level mastery meeting expectations.
   - Aligned with the formal curriculum objectives and terminology.
   - Balanced explanation with formal definitions, rules, and mathematical/scientific notation.
   - Rigorous worked examples and standard assessment practice questions.

3. ADVANCED TIER: For high-mastery students who have mastered core concepts.
   - Increase conceptual depth, theoretical implications, and higher-order Bloom's analysis/evaluation.
   - Address edge cases, trade-offs, optimization, and real-world or interdisciplinary applications.
   - Provide open-ended challenge problems and extension projects pushing beyond the standard syllabus.`

  let userContext = `Generate 3-Tier Differentiated Adaptive Learning Tracks for:
- Subject: ${input.subject || 'General Subject'}
- Grade / Level: ${input.grade || 'Standard Secondary'}
- Topic: ${input.topic}
- Core Learning Objective: ${input.learningObjective || `Mastery of ${input.topic}`}
- Curriculum / Board: ${input.curriculum || 'Standard National Curriculum'}`

  if (input.materialAnalysisContext) {
    const mac = input.materialAnalysisContext
    userContext += `\n\n--- Material Analysis Knowledge Graph ---`
    if (mac.coreConcepts?.length) userContext += `\nCore Concepts: ${mac.coreConcepts.join(', ')}`
    if (mac.subConcepts?.length) userContext += `\nSub-Concepts: ${mac.subConcepts.join(', ')}`
    if (mac.prerequisites?.length) userContext += `\nPrerequisites: ${mac.prerequisites.join(', ')}`
    if (mac.commonMisconceptions?.length) userContext += `\nCommon Misconceptions: ${mac.commonMisconceptions.join(', ')}`
    if (mac.learningOutcomes?.length) userContext += `\nTarget Outcomes: ${mac.learningOutcomes.join(', ')}`
  }

  if (input.studentPerformanceContext) {
    const spc = input.studentPerformanceContext
    userContext += `\n\n--- Student Performance & Diagnostic Context ---`
    if (spc.studentName) userContext += `\nStudent: ${spc.studentName}`
    if (spc.masteryLevel !== undefined) userContext += `\nMastery Score: ${spc.masteryLevel}% (Tier: ${spc.overallTier || 'Evaluating'})`
    if (spc.weakConcepts?.length) userContext += `\nIdentified Weak Concepts (MUST be scaffolded in Remedial): ${spc.weakConcepts.join(', ')}`
    if (spc.strongConcepts?.length) userContext += `\nDemonstrated Strong Concepts: ${spc.strongConcepts.join(', ')}`
    if (spc.recentQuizScores?.length) userContext += `\nRecent Assessment Scores: ${spc.recentQuizScores.join('%, ')}%`
  }

  userContext += `\n\nOutput strict JSON containing all 3 tiers with distinct, high-quality pedagogical content.`

  const rawJson = await callGeminiModels(systemPrompt, userContext)

  try {
    const parsed = extractJsonFromText<any>(rawJson)
    const tiers = parsed.tiers || parsed

    const sanitizeArray = (arr: any, fallback: string[] = []): string[] => {
      if (Array.isArray(arr)) {
        const cleaned = arr.map((item) => String(item).trim()).filter(Boolean)
        if (cleaned.length > 0) return cleaned
      }
      return fallback
    }

    const formatTier = (level: 'Remedial' | 'Standard' | 'Advanced', tierData: any): AdaptiveTrack => {
      const data = tierData || {}
      const points = sanitizeArray(
        data.keyConcepts,
        sanitizeArray(data.learningObjectives, [`${level} conceptual mastery in ${input.topic}`]),
      )

      const exampleText =
        Array.isArray(data.examples) && data.examples.length > 0
          ? data.examples.join('\n\n')
          : typeof data.examples === 'string' && data.examples.trim()
            ? data.examples.trim()
            : typeof data.example === 'string' && data.example.trim()
              ? data.example.trim()
              : `Step-by-step worked demonstration model for ${level} level.`

      const practiceText =
        Array.isArray(data.practiceQuestions) && data.practiceQuestions.length > 0
          ? data.practiceQuestions.join('\n\n')
          : Array.isArray(data.challengeQuestions) && data.challengeQuestions.length > 0
            ? data.challengeQuestions.join('\n\n')
            : typeof data.practice === 'string' && data.practice.trim()
              ? data.practice.trim()
              : `Curriculum practice problems for ${level} level.`

      const summaryText =
        typeof data.description === 'string' && data.description.trim()
          ? data.description.trim()
          : typeof data.summary === 'string' && data.summary.trim()
            ? data.summary.trim()
            : `${level} differentiated instructional track for ${input.topic}.`

      return {
        level,
        summary: summaryText,
        description: summaryText,
        learningObjectives: sanitizeArray(data.learningObjectives),
        keyConcepts: sanitizeArray(data.keyConcepts),
        points,
        explanation: typeof data.explanation === 'string' ? data.explanation : undefined,
        example: exampleText,
        examples: sanitizeArray(data.examples),
        activities: sanitizeArray(data.activities),
        practice: practiceText,
        practiceQuestions: sanitizeArray(data.practiceQuestions),
        supportStrategies: sanitizeArray(data.supportStrategies),
        misconceptionsToAddress: sanitizeArray(data.misconceptionsToAddress),
        challengeQuestions: sanitizeArray(data.challengeQuestions),
        extensionActivities: sanitizeArray(data.extensionActivities),
        successCriteria: sanitizeArray(data.successCriteria),
        isApproved: false,
      }
    }

    return [
      formatTier('Remedial', tiers.remedial),
      formatTier('Standard', tiers.standard),
      formatTier('Advanced', tiers.advanced),
    ]
  } catch (err) {
    console.error('[GEMINI-ADAPTIVE-PARSE-ERROR] Raw text:', rawJson)
    throw new Error('Failed to parse structured JSON 3-tier adaptive tracks from Gemini.')
  }
}

// -------------------------------------------------------------
// Lesson Plan Quality & Pedagogical Analysis System
// -------------------------------------------------------------
import type { LessonPlanQualityAnalysis, CriterionAnalysis, PriorityAction } from './types'

export interface LessonPlanAnalysisInput {
  lessonPlanId?: string
  subject: string
  grade: string
  topic: string
  learningObjective: string
  duration?: string
  curriculum?: string
  lessonPlanContent: any
  quizQuestions?: any[]
  materialAnalysisContext?: {
    coreConcepts?: string[]
    subConcepts?: string[]
    prerequisites?: string[]
    commonMisconceptions?: string[]
    learningOutcomes?: string[]
    importantTopics?: string[]
  }
}

export async function analyzeLessonPlanWithGemini(
  input: LessonPlanAnalysisInput,
): Promise<LessonPlanQualityAnalysis> {
  const systemPrompt = `You are TeachAI Master Instructional Designer and Pedagogical Quality Evaluator. You provide rigorous, objective, criterion-referenced evaluations of lesson plans to help educators elevate classroom teaching.

You must analyze the provided lesson plan across 8 core pedagogical criteria and return STRICT JSON matching this exact schema:
{
  "overallScore": number,
  "rating": "Exemplary" | "Strong" | "Satisfactory" | "Needs Improvement",
  "summary": string,
  "criteria": {
    "objectiveAlignment": {
      "score": number,
      "status": "Strong" | "Satisfactory" | "Needs Improvement",
      "explanation": string
    },
    "bloomsAlignment": {
      "score": number,
      "status": "Strong" | "Satisfactory" | "Needs Improvement",
      "levelsDetected": string[],
      "explanation": string
    },
    "contentQuality": {
      "score": number,
      "status": "Strong" | "Satisfactory" | "Needs Improvement",
      "explanation": string
    },
    "pedagogicalQuality": {
      "score": number,
      "status": "Strong" | "Satisfactory" | "Needs Improvement",
      "explanation": string
    },
    "differentiation": {
      "score": number,
      "status": "Strong" | "Satisfactory" | "Needs Improvement",
      "explanation": string
    },
    "assessmentQuality": {
      "score": number,
      "status": "Strong" | "Satisfactory" | "Needs Improvement",
      "explanation": string
    },
    "timeFeasibility": {
      "score": number,
      "status": "Strong" | "Satisfactory" | "Needs Improvement",
      "explanation": string
    },
    "curriculumAlignment": {
      "score": number,
      "status": "Aligned" | "Partially Aligned" | "Insufficient Context",
      "explanation": string
    }
  },
  "strengths": string[],
  "weaknesses": string[],
  "missingElements": string[],
  "improvementSuggestions": string[],
  "priorityActions": [
    {
      "priority": "High" | "Medium" | "Low",
      "issue": string,
      "recommendation": string
    }
  ]
}

EVALUATION RUBRIC & WEIGHTING:
1. Objective Alignment (15%): Are learning activities and assessment aligned with the stated objective? Is the objective measurable?
2. Bloom's Taxonomy Alignment (10%): Detect cognitive levels (Remember, Understand, Apply, Analyze, Evaluate, Create) and verify developmental appropriateness.
3. Content Quality (15%): Conceptual accuracy, depth, logical progression, and coverage of core concepts.
4. Pedagogical Quality (15%): Explanation clarity, active learning, guided modeling, real-world relevance, and classroom engagement.
5. Differentiation (15%): Scaffolding for struggling learners (Remedial) and extension challenges for advanced learners.
6. Assessment Quality (15%): Formative checks, diagnostic checks for misconceptions, exit ticket alignment, and quiz rigor.
7. Time & Feasibility (10%): Pacing and realistic completion within the stated lesson duration.
8. Curriculum Alignment (5%): Alignment with the stated board/curriculum standards. If curriculum context is insufficient, mark "Insufficient Context" with a fair score.

Score objectively based on the actual provided lesson plan text. If the lesson plan has glaring omissions (e.g. no assessment, no differentiation, vague objective), score those criteria appropriately low (e.g. 30-55). If it is thorough and well-scaffolded, award high scores (e.g. 85-95).`

  let userContext = `Evaluate this actual lesson plan and provide a comprehensive pedagogical diagnostic:
- Subject: ${input.subject}
- Grade / Level: ${input.grade}
- Topic: ${input.topic}
- Stated Learning Objective: ${input.learningObjective}
- Planned Duration: ${input.duration || '45 minutes'}
- Educational Board / Curriculum: ${input.curriculum || 'Standard National Curriculum'}

--- TEACHER LESSON PLAN CONTENT ---
${typeof input.lessonPlanContent === 'string' ? input.lessonPlanContent : JSON.stringify(input.lessonPlanContent, null, 2)}
--- END LESSON PLAN CONTENT ---`

  if (input.quizQuestions && input.quizQuestions.length > 0) {
    userContext += `\n\n--- ASSOCIATED ASSESSMENT QUIZ (${input.quizQuestions.length} questions) ---
${JSON.stringify(input.quizQuestions, null, 2)}
--- END ASSOCIATED QUIZ ---`
  }

  if (input.materialAnalysisContext) {
    const mac = input.materialAnalysisContext
    userContext += `\n\n--- MATERIAL ANALYSIS REFERENCE KNOWLEDGE GRAPH ---`
    if (mac.coreConcepts?.length) userContext += `\nTarget Core Concepts: ${mac.coreConcepts.join(', ')}`
    if (mac.subConcepts?.length) userContext += `\nTarget Sub-Concepts: ${mac.subConcepts.join(', ')}`
    if (mac.prerequisites?.length) userContext += `\nPrerequisites: ${mac.prerequisites.join(', ')}`
    if (mac.commonMisconceptions?.length) userContext += `\nCommon Misconceptions: ${mac.commonMisconceptions.join(', ')}`
    if (mac.learningOutcomes?.length) userContext += `\nExpected Learning Outcomes: ${mac.learningOutcomes.join(', ')}`
    userContext += `\n--- END MATERIAL ANALYSIS REFERENCE ---`
  }

  userContext += `\n\nReturn strict JSON evaluating the lesson plan across all 8 criteria.`

  const rawJson = await callGeminiModels(systemPrompt, userContext)

  try {
    const parsed = extractJsonFromText<any>(rawJson)

    const sanitizeArray = (arr: any, fallback: string[] = []): string[] => {
      if (Array.isArray(arr)) {
        const cleaned = arr.map((item) => String(item).trim()).filter(Boolean)
        if (cleaned.length > 0) return cleaned
      }
      return fallback
    }

    const parseCriterion = (crit: any, defaultName: string): CriterionAnalysis => {
      const c = crit || {}
      const rawScore = Number(c.score)
      const score = !isNaN(rawScore) ? Math.max(0, Math.min(100, Math.round(rawScore))) : 75
      let status: any = c.status || (score >= 80 ? 'Strong' : score >= 65 ? 'Satisfactory' : 'Needs Improvement')
      return {
        score,
        status,
        explanation: typeof c.explanation === 'string' && c.explanation.trim() ? c.explanation.trim() : `Evaluation of ${defaultName}.`,
        levelsDetected: Array.isArray(c.levelsDetected) ? c.levelsDetected.map(String) : undefined,
      }
    }

    const criteriaObj = parsed.criteria || {}
    const objectiveAlignment = parseCriterion(criteriaObj.objectiveAlignment, 'Objective Alignment')
    const bloomsAlignment = parseCriterion(criteriaObj.bloomsAlignment, "Bloom's Taxonomy Alignment")
    const contentQuality = parseCriterion(criteriaObj.contentQuality, 'Content Quality')
    const pedagogicalQuality = parseCriterion(criteriaObj.pedagogicalQuality, 'Pedagogical Quality')
    const differentiation = parseCriterion(criteriaObj.differentiation, 'Differentiation')
    const assessmentQuality = parseCriterion(criteriaObj.assessmentQuality, 'Assessment Quality')
    const timeFeasibility = parseCriterion(criteriaObj.timeFeasibility, 'Time & Feasibility')
    const curriculumAlignment = parseCriterion(criteriaObj.curriculumAlignment, 'Curriculum Alignment')

    // Derived overall score if not provided or to ensure transparency
    const weightedScore = Math.round(
      objectiveAlignment.score * 0.15 +
      bloomsAlignment.score * 0.10 +
      contentQuality.score * 0.15 +
      pedagogicalQuality.score * 0.15 +
      differentiation.score * 0.15 +
      assessmentQuality.score * 0.15 +
      timeFeasibility.score * 0.10 +
      curriculumAlignment.score * 0.05
    )

    const overallScore = typeof parsed.overallScore === 'number' && !isNaN(parsed.overallScore)
      ? Math.max(0, Math.min(100, Math.round(parsed.overallScore)))
      : weightedScore

    const rating =
      parsed.rating ||
      (overallScore >= 90 ? 'Exemplary' : overallScore >= 80 ? 'Strong' : overallScore >= 65 ? 'Satisfactory' : 'Needs Improvement')

    const summary =
      typeof parsed.summary === 'string' && parsed.summary.trim()
        ? parsed.summary.trim()
        : `Pedagogical evaluation for "${input.topic}". Overall rating: ${rating} (${overallScore}/100).`

    const strengths = sanitizeArray(parsed.strengths, ['Well-structured lesson progression.'])
    const weaknesses = sanitizeArray(parsed.weaknesses, ['Consider deepening formative assessment and differentiation.'])
    const missingElements = sanitizeArray(parsed.missingElements, [])
    const improvementSuggestions = sanitizeArray(parsed.improvementSuggestions, [
      'Incorporate guided checking questions during direct instruction.',
    ])

    const priorityActions: PriorityAction[] = Array.isArray(parsed.priorityActions) && parsed.priorityActions.length > 0
      ? parsed.priorityActions.map((p: any) => ({
          priority: p.priority === 'High' || p.priority === 'Low' ? p.priority : 'Medium',
          issue: String(p.issue || 'Pedagogical opportunity'),
          recommendation: String(p.recommendation || 'Refine lesson plan section.'),
        }))
      : [
          {
            priority: 'Medium',
            issue: 'Differentiated scaffolding',
            recommendation: 'Add dedicated remedial prompts for learners who struggle with prerequisite concepts.',
          },
        ]

    const breakdown = [
      { label: 'Objective Alignment', score: objectiveAlignment.score, explanation: objectiveAlignment.explanation },
      { label: "Bloom's Taxonomy", score: bloomsAlignment.score, explanation: bloomsAlignment.explanation },
      { label: 'Content Quality', score: contentQuality.score, explanation: contentQuality.explanation },
      { label: 'Pedagogical Quality', score: pedagogicalQuality.score, explanation: pedagogicalQuality.explanation },
      { label: 'Differentiation', score: differentiation.score, explanation: differentiation.explanation },
      { label: 'Assessment Quality', score: assessmentQuality.score, explanation: assessmentQuality.explanation },
      { label: 'Time Feasibility', score: timeFeasibility.score, explanation: timeFeasibility.explanation },
      { label: 'Curriculum Alignment', score: curriculumAlignment.score, explanation: curriculumAlignment.explanation },
    ]

    return {
      overallScore,
      rating,
      summary,
      criteria: {
        objectiveAlignment,
        bloomsAlignment,
        contentQuality,
        pedagogicalQuality,
        differentiation,
        assessmentQuality,
        timeFeasibility,
        curriculumAlignment,
      },
      strengths,
      weaknesses,
      missingElements,
      improvementSuggestions,
      priorityActions,
      overall: overallScore,
      verdict: rating,
      breakdown,
      issues: weaknesses,
      improvements: improvementSuggestions,
    }
  } catch (err) {
    console.error('[GEMINI-LESSON-PLAN-ANALYSIS-ERROR] Raw text:', rawJson)
    throw new Error('Failed to parse structured JSON pedagogical analysis from Gemini.')
  }
}

// -------------------------------------------------------------
// AI Diagnostic Recommendation & Learning Gap Engine
// -------------------------------------------------------------
import type {
  DiagnosticReport,
  DiagnosedGap,
  StudentStrength,
  DiagnosedMisconception,
  DiagnosticRecommendationItem,
} from './types'

export interface DiagnosticEvidenceInput {
  student?: {
    id?: string
    name?: string
    grade?: string
    subject?: string
    weakTopics?: string[]
  }
  topic: string
  learningObjective?: string
  curriculum?: string
  performance?: {
    masteryScore?: number
    recentQuizScores?: number[]
    questionResults?: {
      question: string
      concept?: string
      correct: boolean
      feedback?: string
    }[]
    identifiedGaps?: string[]
    strongConcepts?: string[]
    totalQuestions?: number
    correctQuestions?: number
  }
  materialAnalysisContext?: {
    coreConcepts?: string[]
    subConcepts?: string[]
    prerequisites?: string[]
    commonMisconceptions?: string[]
    learningOutcomes?: string[]
  }
  adaptiveContext?: {
    currentTier?: string
    weakConcepts?: string[]
    strongConcepts?: string[]
  }
}

export async function generateDiagnosticRecommendationsWithGemini(
  input: DiagnosticEvidenceInput,
): Promise<DiagnosticReport> {
  const systemPrompt = `You are TeachAI Master Diagnostic Evaluator and Educational Intervention Specialist.
Your primary role is to answer:
1. What is the student struggling with? (Identify specific concepts, backed by concrete evidence).
2. Why might they be struggling? (Diagnose the root pedagogical cause: missing prerequisites, conceptual misconception, difficulty applying principles, or procedural error).
3. What should the teacher do next? (Prescribe actionable, prioritized interventions: Reteach, Scaffold, Practice, Clarify misconception, Assign remedial activity, or Provide advanced extension).

CRITICAL GUIDELINES:
- Every diagnosed gap MUST cite actual evidence from the provided student performance, mastery data, or quiz results.
- Distinguish between established evidence and pedagogical hypotheses using phrases like "Likely cause", "Evidence suggests".
- Low mastery (<60%) requires Remedial scaffolding and targeted reteaching.
- Expected mastery (60-80%) requires targeted practice and clarifying misconceptions.
- High mastery (80%+) shifts toward Advanced extensions, challenge problems, and deeper real-world applications.
- If Material Analysis context is present, cross-reference student errors with documented common misconceptions and prerequisites.

Return STRICT JSON matching this schema:
{
  "studentSummary": string,
  "overallAssessment": string,
  "masteryScore": number,
  "status": "Needs Support" | "On Track" | "Excelling",
  "diagnosedGaps": [
    {
      "concept": string,
      "severity": "High" | "Medium" | "Low",
      "evidence": string,
      "likelyCause": string,
      "confidence": number
    }
  ],
  "strengths": [
    {
      "concept": string,
      "evidence": string
    }
  ],
  "recommendations": [
    {
      "priority": "High" | "Medium" | "Low",
      "type": "Reteach" | "Scaffold" | "Practice" | "Clarify misconception" | "Provide example" | "Assign remedial activity" | "Assign standard practice" | "Provide advanced extension" | "Reassess",
      "targetConcept": string,
      "reason": string,
      "action": string,
      "suggestedActivity": string,
      "recommendedTier": "Remedial" | "Standard" | "Advanced",
      "estimatedTime": string,
      "followUpAssessment": string
    }
  ],
  "misconceptions": [
    {
      "concept": string,
      "misconception": string,
      "evidence": string,
      "correctionStrategy": string
    }
  ],
  "nextStep": string,
  "teacherSummary": string
}`

  let userContext = `Generate evidence-backed diagnostic recommendations for this student performance profile:
- Topic: ${input.topic}
- Subject: ${input.student?.subject || 'Academic Subject'}
- Grade / Level: ${input.student?.grade || 'Grade 10'}
- Stated Learning Objective: ${input.learningObjective || `Mastery of ${input.topic}`}
- Curriculum / Board: ${input.curriculum || 'Standard National Curriculum'}
- Student Name: ${input.student?.name || 'Student'}

--- ACTUAL PERFORMANCE EVIDENCE ---`

  if (input.performance) {
    const p = input.performance
    if (typeof p.masteryScore === 'number') userContext += `\nMastery Score: ${p.masteryScore}%`
    if (p.recentQuizScores?.length) userContext += `\nRecent Assessment Scores: ${p.recentQuizScores.join('%, ')}%`
    if (typeof p.correctQuestions === 'number' && typeof p.totalQuestions === 'number') {
      userContext += `\nQuestions Correct: ${p.correctQuestions} / ${p.totalQuestions}`
    }
    if (p.identifiedGaps?.length) userContext += `\nIdentified Concept Gaps: ${p.identifiedGaps.join(', ')}`
    if (p.strongConcepts?.length) userContext += `\nDemonstrated Strong Concepts: ${p.strongConcepts.join(', ')}`

    if (p.questionResults && p.questionResults.length > 0) {
      userContext += `\n\nQuestion-Level Results (${p.questionResults.length} questions):`
      p.questionResults.forEach((qr, idx) => {
        userContext += `\n  Q${idx + 1} [Concept: ${qr.concept || 'General'}]: ${qr.question} -> ${qr.correct ? 'CORRECT' : 'INCORRECT'}${qr.feedback ? ` (${qr.feedback})` : ''}`
      })
    }
  } else {
    userContext += `\nNo granular quiz attempts logged yet. Evaluate based on initial topic diagnostic baseline.`
  }
  userContext += `\n--- END PERFORMANCE EVIDENCE ---`

  if (input.materialAnalysisContext) {
    const mac = input.materialAnalysisContext
    userContext += `\n\n--- MATERIAL ANALYSIS KNOWLEDGE BASE ---`
    if (mac.coreConcepts?.length) userContext += `\nTarget Core Concepts: ${mac.coreConcepts.join(', ')}`
    if (mac.prerequisites?.length) userContext += `\nPrerequisites: ${mac.prerequisites.join(', ')}`
    if (mac.commonMisconceptions?.length) userContext += `\nKnown Student Misconceptions: ${mac.commonMisconceptions.join(', ')}`
    if (mac.learningOutcomes?.length) userContext += `\nExpected Outcomes: ${mac.learningOutcomes.join(', ')}`
    userContext += `\n--- END MATERIAL ANALYSIS ---`
  }

  userContext += `\n\nSynthesize the diagnostic evidence and return STRICT JSON matching the diagnostic schema.`

  const rawJson = await callGeminiModels(systemPrompt, userContext)

  try {
    const parsed = extractJsonFromText<any>(rawJson)

    const sanitizeArray = <T>(arr: any, fallback: T[] = []): T[] => {
      if (Array.isArray(arr) && arr.length > 0) return arr
      return fallback
    }

    const masteryScore = typeof parsed.masteryScore === 'number'
      ? parsed.masteryScore
      : input.performance?.masteryScore || 50

    const status =
      parsed.status ||
      (masteryScore >= 80 ? 'Excelling' : masteryScore >= 60 ? 'On Track' : 'Needs Support')

    const studentSummary =
      typeof parsed.studentSummary === 'string' && parsed.studentSummary.trim()
        ? parsed.studentSummary.trim()
        : `${input.student?.name || 'The student'} has a mastery score of ${masteryScore}% on ${input.topic}.`

    const overallAssessment =
      typeof parsed.overallAssessment === 'string' && parsed.overallAssessment.trim()
        ? parsed.overallAssessment.trim()
        : `Assessment status: ${status}. Evidence shows targeted areas for intervention.`

    const diagnosedGaps: DiagnosedGap[] = Array.isArray(parsed.diagnosedGaps)
      ? parsed.diagnosedGaps.map((dg: any) => ({
          concept: String(dg.concept || 'Target Concept'),
          severity: dg.severity === 'High' || dg.severity === 'Low' ? dg.severity : 'Medium',
          evidence: String(dg.evidence || 'Quiz question responses indicate difficulty.'),
          likelyCause: String(dg.likelyCause || 'Concept confusion or incomplete prerequisite mastery.'),
          confidence: typeof dg.confidence === 'number' ? dg.confidence : 85,
        }))
      : []

    const strengths: StudentStrength[] = Array.isArray(parsed.strengths)
      ? parsed.strengths.map((st: any) => ({
          concept: String(st.concept || 'Mastered concept'),
          evidence: String(st.evidence || 'Correct answer on assessment.'),
        }))
      : []

    const recommendations: DiagnosticRecommendationItem[] = Array.isArray(parsed.recommendations)
      ? parsed.recommendations.map((r: any, idx: number) => ({
          id: `rec-diag-${Date.now()}-${idx + 1}`,
          priority: r.priority === 'High' || r.priority === 'Low' ? r.priority : 'Medium',
          type: String(r.type || 'Reteach'),
          targetConcept: String(r.targetConcept || input.topic),
          reason: String(r.reason || 'To address diagnosed learning gap.'),
          action: String(r.action || 'Assign targeted activity.'),
          suggestedActivity: String(r.suggestedActivity || 'Guided practice worksheet.'),
          recommendedTier: r.recommendedTier === 'Advanced' || r.recommendedTier === 'Remedial' ? r.recommendedTier : 'Standard',
          estimatedTime: r.estimatedTime || '15 mins',
          followUpAssessment: String(r.followUpAssessment || '3-question formative check.'),
          actions: [
            String(r.action || 'Assign targeted activity.'),
            String(r.suggestedActivity || 'Guided practice worksheet.'),
            String(r.followUpAssessment || '3-question formative check.'),
          ].filter(Boolean),
        }))
      : []

    const misconceptions: DiagnosedMisconception[] = Array.isArray(parsed.misconceptions)
      ? parsed.misconceptions.map((m: any) => ({
          concept: String(m.concept || 'Concept'),
          misconception: String(m.misconception || 'Misconception identified.'),
          evidence: String(m.evidence || 'Student response error.'),
          correctionStrategy: String(m.correctionStrategy || 'Direct contrast and counter-example.'),
        }))
      : []

    const nextStep =
      typeof parsed.nextStep === 'string' && parsed.nextStep.trim()
        ? parsed.nextStep.trim()
        : `Assign the high-priority intervention for ${diagnosedGaps[0]?.concept || input.topic}.`

    const teacherSummary =
      typeof parsed.teacherSummary === 'string' && parsed.teacherSummary.trim()
        ? parsed.teacherSummary.trim()
        : overallAssessment

    return {
      studentSummary,
      overallAssessment,
      masteryScore,
      status,
      diagnosedGaps,
      strengths,
      recommendations,
      misconceptions,
      nextStep,
      teacherSummary,
    }
  } catch (err) {
    console.error('[GEMINI-DIAGNOSTIC-PARSE-ERROR] Raw text:', rawJson)
    throw new Error('Failed to parse structured JSON diagnostic report from Gemini.')
  }
}

// -------------------------------------------------------------
// Real AI Quiz Evaluation & Learning-Gap Analysis Engine
// -------------------------------------------------------------
import type {
  QuizLearningAnalysis,
  QuizLearningGap,
  QuizMisconception,
  QuizStrength,
  QuizLearningAction,
} from './types'

export interface QuizAnalysisInput {
  quizTitle: string
  subject?: string
  grade?: string
  topic: string
  learningObjective?: string
  curriculum?: string
  student?: {
    id?: string
    name?: string
  }
  score: number
  total: number
  percentage: number
  questionResults: {
    question: string
    concept?: string
    difficulty?: string
    correctAnswer: string
    studentAnswer: string
    correct: boolean
    explanation?: string
  }[]
  materialAnalysisContext?: {
    coreConcepts?: string[]
    subConcepts?: string[]
    prerequisites?: string[]
    commonMisconceptions?: string[]
    learningOutcomes?: string[]
  }
  previousPerformance?: {
    masteryScore?: number
    previousScores?: number[]
  }
}

export async function analyzeQuizPerformanceWithGemini(
  input: QuizAnalysisInput,
): Promise<QuizLearningAnalysis> {
  const systemPrompt = `You are TeachAI Master Psychometrician and Learning-Gap Diagnostician.
You analyze completed student assessments AFTER deterministic answer evaluation.

IMPORTANT RULES:
- Deterministic scoring is authoritative. Do NOT alter or question whether an answer is correct or incorrect.
- Identify the student's conceptual strengths where questions were answered correctly.
- Group related incorrect answers into meaningful, cohesive learning gaps with recurring patterns and likely pedagogical causes.
- Distinguish between observed evidence, likely misconceptions, and possible causes.
- If question difficulty (Easy/Medium/Hard) is provided, evaluate whether performance diminishes with cognitive complexity.
- If Material Analysis context is provided, cross-reference student errors with documented common misconceptions and prerequisites.
- Prescribe actionable next learning steps and recommend an appropriate learning tier:
    * Score <60% -> Remedial
    * Score 60-80% -> Standard
    * Score >80% -> Advanced

Return STRICT JSON matching this schema:
{
  "overallSummary": string,
  "performance": {
    "score": number,
    "percentage": number,
    "status": "Needs Support" | "On Track" | "Excelling"
  },
  "strengths": [
    {
      "concept": string,
      "evidence": string,
      "confidence": number
    }
  ],
  "learningGaps": [
    {
      "concept": string,
      "severity": "High" | "Medium" | "Low",
      "evidence": string[],
      "pattern": string,
      "likelyCause": string,
      "confidence": number
    }
  ],
  "misconceptions": [
    {
      "concept": string,
      "misconception": string,
      "evidence": string,
      "correctionStrategy": string,
      "confidence": number
    }
  ],
  "difficultyAnalysis": {
    "available": boolean,
    "summary": string
  },
  "recommendedTier": "Remedial" | "Standard" | "Advanced",
  "nextLearningActions": [
    {
      "priority": "High" | "Medium" | "Low",
      "concept": string,
      "action": string,
      "reason": string,
      "suggestedActivity": string,
      "estimatedTime": string
    }
  ],
  "teacherSummary": string
}`

  let userContext = `Analyze student quiz performance and synthesize learning gaps:
- Quiz Title: ${input.quizTitle}
- Subject: ${input.subject || 'Academic Subject'}
- Grade / Level: ${input.grade || 'Grade 10'}
- Topic: ${input.topic}
- Learning Objective: ${input.learningObjective || `Mastery of ${input.topic}`}
- Curriculum / Board: ${input.curriculum || 'Standard National Curriculum'}
- Student: ${input.student?.name || 'Student'}

--- DETERMINISTIC ASSESSMENT RESULTS ---
Deterministic Score: ${input.score} / ${input.total} (${input.percentage}%)

Question-Level Performance Breakdown:`

  input.questionResults.forEach((qr, idx) => {
    userContext += `\n  Q${idx + 1} [Concept: ${qr.concept || 'General'}${qr.difficulty ? `, Difficulty: ${qr.difficulty}` : ''}]:
    Question: ${qr.question}
    Student Answer: "${qr.studentAnswer || 'None'}"
    Correct Answer: "${qr.correctAnswer}"
    Result: ${qr.correct ? 'CORRECT' : 'INCORRECT'}
    Explanation: ${qr.explanation || 'N/A'}`
  })
  userContext += `\n--- END ASSESSMENT RESULTS ---`

  if (input.materialAnalysisContext) {
    const mac = input.materialAnalysisContext
    userContext += `\n\n--- MATERIAL ANALYSIS REFERENCE KNOWLEDGE BASE ---`
    if (mac.coreConcepts?.length) userContext += `\nCore Concepts: ${mac.coreConcepts.join(', ')}`
    if (mac.prerequisites?.length) userContext += `\nPrerequisites: ${mac.prerequisites.join(', ')}`
    if (mac.commonMisconceptions?.length) userContext += `\nKnown Student Misconceptions: ${mac.commonMisconceptions.join(', ')}`
    if (mac.learningOutcomes?.length) userContext += `\nExpected Learning Outcomes: ${mac.learningOutcomes.join(', ')}`
    userContext += `\n--- END MATERIAL ANALYSIS REFERENCE ---`
  }

  userContext += `\n\nSynthesize the learning gap analysis and return STRICT JSON.`

  const rawJson = await callGeminiModels(systemPrompt, userContext)

  try {
    const parsed = extractJsonFromText<any>(rawJson)

    const defaultTier =
      input.percentage >= 80 ? 'Advanced' : input.percentage >= 60 ? 'Standard' : 'Remedial'
    const recommendedTier =
      parsed.recommendedTier === 'Advanced' || parsed.recommendedTier === 'Remedial' || parsed.recommendedTier === 'Standard'
        ? parsed.recommendedTier
        : defaultTier

    const status =
      parsed.performance?.status ||
      (input.percentage >= 80 ? 'Excelling' : input.percentage >= 60 ? 'On Track' : 'Needs Support')

    const overallSummary =
      typeof parsed.overallSummary === 'string' && parsed.overallSummary.trim()
        ? parsed.overallSummary.trim()
        : `${input.student?.name || 'Student'} scored ${input.score}/${input.total} (${input.percentage}%). Status: ${status}.`

    const strengths: QuizStrength[] = Array.isArray(parsed.strengths)
      ? parsed.strengths.map((s: any) => ({
          concept: String(s.concept || 'Mastered Concept'),
          evidence: String(s.evidence || 'Correct answer on assessment.'),
          confidence: typeof s.confidence === 'number' ? s.confidence : 90,
        }))
      : []

    const learningGaps: QuizLearningGap[] = Array.isArray(parsed.learningGaps)
      ? parsed.learningGaps.map((g: any) => ({
          concept: String(g.concept || 'Target Concept'),
          severity: g.severity === 'High' || g.severity === 'Low' ? g.severity : 'Medium',
          evidence: Array.isArray(g.evidence) ? g.evidence.map(String) : ['Incorrect question answer'],
          pattern: String(g.pattern || 'Difficulty applying core concept.'),
          likelyCause: String(g.likelyCause || 'Conceptual confusion or incomplete prerequisite mastery.'),
          confidence: typeof g.confidence === 'number' ? g.confidence : 85,
        }))
      : []

    const misconceptions: QuizMisconception[] = Array.isArray(parsed.misconceptions)
      ? parsed.misconceptions.map((m: any) => ({
          concept: String(m.concept || 'Concept'),
          misconception: String(m.misconception || 'Student misconception detected.'),
          evidence: String(m.evidence || 'Error on quiz question.'),
          correctionStrategy: String(m.correctionStrategy || 'Review rule and contrast with counter-examples.'),
          confidence: typeof m.confidence === 'number' ? m.confidence : 85,
        }))
      : []

    const difficultyAnalysis = parsed.difficultyAnalysis
      ? {
          available: Boolean(parsed.difficultyAnalysis.available),
          summary: String(parsed.difficultyAnalysis.summary || 'Difficulty distribution analyzed.'),
        }
      : undefined

    const nextLearningActions: QuizLearningAction[] = Array.isArray(parsed.nextLearningActions)
      ? parsed.nextLearningActions.map((a: any) => ({
          priority: a.priority === 'High' || a.priority === 'Low' ? a.priority : 'Medium',
          concept: String(a.concept || input.topic),
          action: String(a.action || 'Complete targeted learning review.'),
          reason: String(a.reason || 'Address identified knowledge gap.'),
          suggestedActivity: String(a.suggestedActivity || 'Guided practice worksheet.'),
          estimatedTime: String(a.estimatedTime || '15 mins'),
        }))
      : [
          {
            priority: 'Medium',
            concept: input.topic,
            action: 'Review incorrect questions and study guided explanations.',
            reason: 'Reinforce conceptual baseline.',
            suggestedActivity: 'Review quiz feedback and practice analogous problems.',
            estimatedTime: '15 mins',
          },
        ]

    const teacherSummary =
      typeof parsed.teacherSummary === 'string' && parsed.teacherSummary.trim()
        ? parsed.teacherSummary.trim()
        : overallSummary

    return {
      overallSummary,
      performance: {
        score: input.score,
        percentage: input.percentage,
        status,
      },
      strengths,
      learningGaps,
      misconceptions,
      difficultyAnalysis,
      recommendedTier,
      nextLearningActions,
      teacherSummary,
    }
  } catch (err) {
    console.error('[GEMINI-QUIZ-ANALYSIS-ERROR] Raw text:', rawJson)
    throw new Error('Failed to parse structured JSON quiz learning analysis from Gemini.')
  }
}

// -------------------------------------------------------------
// Real AI Personalized Practice Generator Engine
// -------------------------------------------------------------
import type {
  PersonalizedPracticeSet,
  PracticeQuestion,
  LearningLevel,
} from './types'

export interface PersonalizedPracticeInput {
  topic: string
  subject?: string
  grade?: string
  learningObjective?: string
  curriculum?: string
  student?: {
    id?: string
    name?: string
    level?: LearningLevel
    masteryScore?: number
  }
  weakConcepts?: string[]
  learningGaps?: {
    concept: string
    severity?: string
    evidence?: string
    likelyCause?: string
  }[]
  misconceptions?: {
    concept: string
    misconception: string
    correctionStrategy?: string
  }[]
  strongConcepts?: string[]
  materialAnalysisContext?: {
    coreConcepts?: string[]
    prerequisites?: string[]
    commonMisconceptions?: string[]
    learningOutcomes?: string[]
  }
  numberOfQuestions?: number
  previousPracticeQuestions?: string[]
}

export async function generatePersonalizedPracticeWithGemini(
  input: PersonalizedPracticeInput,
): Promise<PersonalizedPracticeSet> {
  const numQuestions = input.numberOfQuestions || 5
  const mastery = input.student?.masteryScore ?? 50
  const tier: LearningLevel =
    input.student?.level ||
    (mastery >= 80 ? 'Advanced' : mastery >= 60 ? 'Standard' : 'Remedial')

  const systemPrompt = `You are TeachAI Master Adaptive Practice Architect and Pedagogical Engineer.
Your task is to generate TARGETED, PERSONALIZED PRACTICE QUESTIONS specifically tailored to an individual student's diagnostic needs.

CRITICAL INSTRUCTIONS:
- Do NOT generate a generic practice worksheet. Focus precisely on the student's identified weak concepts, learning gaps, and cognitive misconceptions.
- Match question difficulty and cognitive scaffolding to the student's current learning level:
    * Remedial (<60% mastery): Scaffolded progression -> basic recognition -> guided application -> misconception check -> transfer problem.
    * Standard (60-80% mastery): Solid grade-level application -> conceptual discrimination -> multi-step problem solving.
    * Advanced (>80% mastery): High-order scenario analysis -> edge cases -> complex application and synthesis.
- Misconception-Targeted Questions: If known student misconceptions are provided, create at least 1-2 questions specifically formulated to detect and resolve that misconception (e.g., contrasting the misconception with the correct principle).
- Distractors for MCQs: Formulate 4 distinct, plausible options with exactly ONE unambiguously correct answer. Include realistic distractors based on common student errors.
- Never repeat questions listed in the "EXCLUDE / PREVIOUSLY ATTEMPTED QUESTIONS" list.

Return STRICT JSON matching this schema:
{
  "title": string,
  "topic": string,
  "targetConcepts": string[],
  "recommendedTier": "Remedial" | "Standard" | "Advanced",
  "reason": string,
  "estimatedMinutes": number,
  "questions": [
    {
      "type": "MCQ" | "True/False" | "Short Answer",
      "question": string,
      "options": string[],
      "answer": string,
      "explanation": string,
      "concept": string,
      "difficulty": "Easy" | "Medium" | "Hard",
      "skill": string,
      "targetedMisconception": string
    }
  ]
}`

  let userContext = `Generate ${numQuestions} personalized practice questions for the following student:
- Topic: ${input.topic}
- Subject: ${input.subject || 'Academic Subject'}
- Grade / Level: ${input.grade || 'Grade 10'}
- Learning Objective: ${input.learningObjective || `Mastery of ${input.topic}`}
- Student Name: ${input.student?.name || 'Student'}
- Student Current Mastery: ${mastery}% (Target Level: ${tier})`

  if (input.weakConcepts && input.weakConcepts.length > 0) {
    userContext += `\n- Weak Concepts Needing Practice: ${input.weakConcepts.join(', ')}`
  }

  if (input.learningGaps && input.learningGaps.length > 0) {
    userContext += `\n- Diagnosed Knowledge Gaps:`
    input.learningGaps.forEach((g) => {
      userContext += `\n    * Concept: ${g.concept} (Severity: ${g.severity || 'Medium'}). Evidence: ${g.evidence || 'Assessment errors'}. Likely Cause: ${g.likelyCause || 'Conceptual confusion'}.`
    })
  }

  if (input.misconceptions && input.misconceptions.length > 0) {
    userContext += `\n- Identified Student Misconceptions (MUST formulate targeted questions to test these!):`
    input.misconceptions.forEach((m) => {
      userContext += `\n    * Concept: ${m.concept} | Misconception: "${m.misconception}" | Correction Strategy: ${m.correctionStrategy || 'Contrast rule'}`
    })
  }

  if (input.strongConcepts && input.strongConcepts.length > 0) {
    userContext += `\n- Concepts Already Mastered (Do NOT over-focus on these): ${input.strongConcepts.join(', ')}`
  }

  if (input.materialAnalysisContext) {
    const mac = input.materialAnalysisContext
    userContext += `\n\n--- MATERIAL ANALYSIS KNOWLEDGE BASE ---`
    if (mac.coreConcepts?.length) userContext += `\nCore Concepts: ${mac.coreConcepts.join(', ')}`
    if (mac.prerequisites?.length) userContext += `\nPrerequisites: ${mac.prerequisites.join(', ')}`
    if (mac.commonMisconceptions?.length) userContext += `\nKnown Misconceptions: ${mac.commonMisconceptions.join(', ')}`
    userContext += `\n--- END MATERIAL ANALYSIS ---`
  }

  if (input.previousPracticeQuestions && input.previousPracticeQuestions.length > 0) {
    userContext += `\n\n--- EXCLUDE / PREVIOUSLY ATTEMPTED QUESTIONS (Do not repeat any of these!) ---`
    input.previousPracticeQuestions.slice(0, 10).forEach((pq, idx) => {
      userContext += `\n${idx + 1}. ${pq}`
    })
    userContext += `\n--- END EXCLUSIONS ---`
  }

  userContext += `\n\nSynthesize personalized questions and return STRICT JSON.`

  const rawJson = await callGeminiModels(systemPrompt, userContext)

  try {
    const parsed = extractJsonFromText<any>(rawJson)

    const title =
      typeof parsed.title === 'string' && parsed.title.trim()
        ? parsed.title.trim()
        : `Personalized Practice: ${input.topic}`

    const targetConcepts: string[] = Array.isArray(parsed.targetConcepts)
      ? parsed.targetConcepts.map(String)
      : input.weakConcepts && input.weakConcepts.length > 0
        ? input.weakConcepts
        : [input.topic]

    const recommendedTier: LearningLevel =
      parsed.recommendedTier === 'Advanced' ||
      parsed.recommendedTier === 'Standard' ||
      parsed.recommendedTier === 'Remedial'
        ? parsed.recommendedTier
        : tier

    const reason =
      typeof parsed.reason === 'string' && parsed.reason.trim()
        ? parsed.reason.trim()
        : `Generated based on identified knowledge gaps in ${targetConcepts.join(', ')}.`

    const estimatedMinutes =
      typeof parsed.estimatedMinutes === 'number'
        ? parsed.estimatedMinutes
        : Math.max(5, numQuestions * 2)

    const rawQuestions: any[] = Array.isArray(parsed.questions) ? parsed.questions : []
    const questions: PracticeQuestion[] = rawQuestions.map((q, idx) => {
      const qType =
        q.type === 'True/False' || q.type === 'Short Answer' || q.type === 'MCQ'
          ? q.type
          : 'MCQ'

      let options: string[] | undefined = undefined
      if (qType === 'MCQ') {
        if (Array.isArray(q.options) && q.options.length >= 2) {
          options = q.options.map(String)
        } else {
          options = [
            q.answer || 'Option A',
            'Option B',
            'Option C',
            'Option D',
          ]
        }
      } else if (qType === 'True/False') {
        options = ['True', 'False']
      }

      return {
        id: `pq-${Date.now()}-${idx + 1}`,
        type: qType,
        question: String(q.question || `Practice question ${idx + 1} on ${input.topic}`),
        options,
        answer: String(q.answer || (options ? options[0] : 'Correct answer')),
        explanation: String(q.explanation || 'Review the core concept for detailed step-by-step reasoning.'),
        concept: String(q.concept || targetConcepts[0] || input.topic),
        difficulty: q.difficulty === 'Hard' || q.difficulty === 'Easy' ? q.difficulty : 'Medium',
        skill: typeof q.skill === 'string' ? q.skill : 'Apply',
        targetedMisconception: typeof q.targetedMisconception === 'string' ? q.targetedMisconception : undefined,
      }
    })

    return {
      id: `practice-set-${Date.now()}`,
      title,
      topic: input.topic,
      targetConcepts,
      recommendedTier,
      reason,
      estimatedMinutes,
      questions,
      generatedAt: new Date().toISOString(),
    }
  } catch (err) {
    console.error('[GEMINI-PRACTICE-PARSE-ERROR] Raw text:', rawJson)
    throw new Error('Failed to parse structured JSON personalized practice set from Gemini.')
  }
}

// -------------------------------------------------------------
// Real AI Personalized Revision Plan Generator Engine
// -------------------------------------------------------------
import type {
  PersonalizedRevisionPlan,
  RevisionDayPlan,
  RevisionPriorityArea,
  RevisionActivity,
} from './types'

export interface RevisionPlanInput {
  topic: string
  subject?: string
  grade?: string
  learningObjective?: string
  curriculum?: string
  student?: {
    id?: string
    name?: string
    level?: LearningLevel
    masteryScore?: number
  }
  durationDays?: number
  weakConcepts?: string[]
  learningGaps?: {
    concept: string
    severity?: string
    evidence?: string
    likelyCause?: string
  }[]
  misconceptions?: {
    concept: string
    misconception: string
    correctionStrategy?: string
  }[]
  strongConcepts?: string[]
  practiceResults?: {
    score?: number
    total?: number
    percentage?: number
    conceptsMastered?: string[]
    conceptsStillWeak?: string[]
  }
  materialAnalysisContext?: {
    coreConcepts?: string[]
    prerequisites?: string[]
    commonMisconceptions?: string[]
    learningOutcomes?: string[]
  }
}

export async function generatePersonalizedRevisionPlanWithGemini(
  input: RevisionPlanInput,
): Promise<PersonalizedRevisionPlan> {
  const durationDays = input.durationDays && input.durationDays > 0 ? input.durationDays : 7
  const mastery = input.student?.masteryScore ?? 50
  const tier: LearningLevel =
    input.student?.level ||
    (mastery >= 80 ? 'Advanced' : mastery >= 60 ? 'Standard' : 'Remedial')

  const systemPrompt = `You are TeachAI Master Revision Strategist and Cognitive Learning Architect.
Your task is to synthesize a REAL, EVIDENCE-BASED PERSONALIZED REVISION PLAN for a student based on their actual performance history.

CRITICAL INSTRUCTIONS:
- Do NOT generate a generic static timetable. Every priority area and daily activity must be grounded in the student's actual performance evidence.
- Prioritize revision based on:
    1. Severe learning gaps (e.g. repeated question failures)
    2. Persistent cognitive misconceptions (specifically schedule activities that contrast the misconception with correct rules)
    3. Low-mastery concepts (<60%)
    4. Prerequisites affecting other concepts
    5. Recently improved concepts needing reinforcement
    6. Mastered concepts (>80%) only for light maintenance
- Structure the daily plan across exactly ${durationDays} days:
    * Follow a pedagogical progression: Learn / Review -> Practice -> Reinforce -> Reassess.
    * For struggling students: Provide foundational reviews, worked examples, and misconception checks before practice.
    * For proficient students: Emphasize higher-order application, edge-case analysis, and challenge problems.
- Workload: Keep daily workload realistic and manageable (15-35 minutes per day).
- Reassessment: Include a clear recommendation at the end of the plan to reassess the student on their previously weak concepts.

Return STRICT JSON matching this schema:
{
  "title": string,
  "topic": string,
  "overallGoal": string,
  "currentMastery": number,
  "recommendedTier": "Remedial" | "Standard" | "Advanced",
  "durationDays": number,
  "priorityAreas": [
    {
      "concept": string,
      "priority": "High" | "Medium" | "Low",
      "currentMastery": number,
      "reason": string
    }
  ],
  "dailyPlans": [
    {
      "day": number,
      "focusConcepts": string[],
      "priority": "High" | "Medium" | "Low",
      "goal": string,
      "estimatedMinutes": number,
      "activities": [
        {
          "type": "Review" | "Practice" | "Reinforce" | "Reassess",
          "title": string,
          "description": string,
          "durationMinutes": number,
          "targetConcept": string
        }
      ]
    }
  ],
  "reassessment": {
    "recommended": boolean,
    "targetConcepts": string[],
    "reason": string,
    "suggestedQuizTopic": string
  }
}`

  let userContext = `Synthesize a ${durationDays}-day personalized revision plan for the following student:
- Topic: ${input.topic}
- Subject: ${input.subject || 'Academic Subject'}
- Grade / Level: ${input.grade || 'Grade 10'}
- Learning Objective: ${input.learningObjective || `Mastery of ${input.topic}`}
- Student Name: ${input.student?.name || 'Student'}
- Current Topic Mastery: ${mastery}% (Assigned Tier: ${tier})
- Requested Revision Duration: ${durationDays} Days`

  if (input.weakConcepts && input.weakConcepts.length > 0) {
    userContext += `\n- Weak Concepts Needing Priority Revision: ${input.weakConcepts.join(', ')}`
  }

  if (input.learningGaps && input.learningGaps.length > 0) {
    userContext += `\n- Diagnosed Knowledge Gaps & Evidence:`
    input.learningGaps.forEach((g) => {
      userContext += `\n    * Concept: ${g.concept} (Severity: ${g.severity || 'High'}). Evidence: ${g.evidence || 'Assessment errors'}. Likely Cause: ${g.likelyCause || 'Confusion'}.`
    })
  }

  if (input.misconceptions && input.misconceptions.length > 0) {
    userContext += `\n- Identified Student Misconceptions (Schedule targeted misconception checks):`
    input.misconceptions.forEach((m) => {
      userContext += `\n    * Concept: ${m.concept} | Misconception: "${m.misconception}" | Strategy: ${m.correctionStrategy || 'Contrast rule'}`
    })
  }

  if (input.strongConcepts && input.strongConcepts.length > 0) {
    userContext += `\n- Mastered Strengths (Do NOT over-allocate time; schedule only light maintenance): ${input.strongConcepts.join(', ')}`
  }

  if (input.practiceResults) {
    const pr = input.practiceResults
    userContext += `\n\n--- RECENT PERSONALIZED PRACTICE EVIDENCE ---`
    if (typeof pr.percentage === 'number') userContext += `\nRecent Practice Score: ${pr.score}/${pr.total} (${pr.percentage}%)`
    if (pr.conceptsMastered?.length) userContext += `\nConcepts Recently Improved: ${pr.conceptsMastered.join(', ')}`
    if (pr.conceptsStillWeak?.length) userContext += `\nConcepts Still Needing Work: ${pr.conceptsStillWeak.join(', ')}`
    userContext += `\n--- END PRACTICE EVIDENCE ---`
  }

  if (input.materialAnalysisContext) {
    const mac = input.materialAnalysisContext
    userContext += `\n\n--- MATERIAL ANALYSIS KNOWLEDGE BASE ---`
    if (mac.coreConcepts?.length) userContext += `\nCore Concepts: ${mac.coreConcepts.join(', ')}`
    if (mac.prerequisites?.length) userContext += `\nPrerequisites: ${mac.prerequisites.join(', ')}`
    if (mac.commonMisconceptions?.length) userContext += `\nKnown Misconceptions: ${mac.commonMisconceptions.join(', ')}`
    if (mac.learningOutcomes?.length) userContext += `\nExpected Outcomes: ${mac.learningOutcomes.join(', ')}`
    userContext += `\n--- END MATERIAL ANALYSIS ---`
  }

  userContext += `\n\nGenerate the complete ${durationDays}-day personalized revision plan and return STRICT JSON.`

  const rawJson = await callGeminiModels(systemPrompt, userContext)

  try {
    const parsed = extractJsonFromText<any>(rawJson)

    const title =
      typeof parsed.title === 'string' && parsed.title.trim()
        ? parsed.title.trim()
        : `${durationDays}-Day Personalized Revision Plan: ${input.topic}`

    const overallGoal =
      typeof parsed.overallGoal === 'string' && parsed.overallGoal.trim()
        ? parsed.overallGoal.trim()
        : `Close identified knowledge gaps in ${input.topic} and elevate mastery above 80%.`

    const recommendedTier: LearningLevel =
      parsed.recommendedTier === 'Advanced' ||
      parsed.recommendedTier === 'Standard' ||
      parsed.recommendedTier === 'Remedial'
        ? parsed.recommendedTier
        : tier

    const priorityAreas: RevisionPriorityArea[] = Array.isArray(parsed.priorityAreas)
      ? parsed.priorityAreas.map((pa: any) => ({
          concept: String(pa.concept || input.topic),
          priority: pa.priority === 'High' || pa.priority === 'Low' ? pa.priority : 'Medium',
          currentMastery: typeof pa.currentMastery === 'number' ? pa.currentMastery : mastery,
          reason: String(pa.reason || 'Evidence from assessment diagnostics indicates conceptual difficulty.'),
        }))
      : (input.weakConcepts || [input.topic]).map((c) => ({
          concept: c,
          priority: 'High',
          currentMastery: mastery,
          reason: 'Identified learning gap requiring focused revision.',
        }))

    const rawDailyPlans: any[] = Array.isArray(parsed.dailyPlans) ? parsed.dailyPlans : []
    const dailyPlans: RevisionDayPlan[] = rawDailyPlans.map((dp: any, idx: number) => {
      const dayNum = typeof dp.day === 'number' ? dp.day : idx + 1
      const focusConcepts: string[] = Array.isArray(dp.focusConcepts)
        ? dp.focusConcepts.map(String)
        : [input.topic]
      const dayPriority: 'High' | 'Medium' | 'Low' =
        dp.priority === 'High' || dp.priority === 'Low' ? dp.priority : 'Medium'
      const goal = String(dp.goal || `Day ${dayNum} revision goal`)
      const estimatedMinutes =
        typeof dp.estimatedMinutes === 'number' ? dp.estimatedMinutes : 25

      const activities: RevisionActivity[] = Array.isArray(dp.activities)
        ? dp.activities.map((act: any) => ({
            id: `act-d${dayNum}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            type:
              act.type === 'Practice' ||
              act.type === 'Reinforce' ||
              act.type === 'Reassess' ||
              act.type === 'Review'
                ? act.type
                : 'Review',
            title: String(act.title || 'Revision Activity'),
            description: String(act.description || 'Review conceptual rules and worked examples.'),
            durationMinutes: typeof act.durationMinutes === 'number' ? act.durationMinutes : 15,
            targetConcept: String(act.targetConcept || focusConcepts[0] || input.topic),
            isCompleted: false,
          }))
        : [
            {
              id: `act-d${dayNum}-rev`,
              type: 'Review',
              title: `Review ${focusConcepts.join(', ')}`,
              description: 'Study core definitions and step-by-step worked examples.',
              durationMinutes: 15,
              targetConcept: focusConcepts[0] || input.topic,
              isCompleted: false,
            },
            {
              id: `act-d${dayNum}-prac`,
              type: 'Practice',
              title: `Targeted Practice on ${focusConcepts[0] || input.topic}`,
              description: 'Solve adaptive practice problems to reinforce understanding.',
              durationMinutes: 15,
              targetConcept: focusConcepts[0] || input.topic,
              isCompleted: false,
            },
          ]

      return {
        day: dayNum,
        focusConcepts,
        priority: dayPriority,
        goal,
        estimatedMinutes,
        activities,
        isCompleted: false,
      }
    })

    const reassessment = parsed.reassessment
      ? {
          recommended: Boolean(parsed.reassessment.recommended),
          targetConcepts: Array.isArray(parsed.reassessment.targetConcepts)
            ? parsed.reassessment.targetConcepts.map(String)
            : input.weakConcepts || [input.topic],
          reason: String(
            parsed.reassessment.reason ||
              'Verify that previously diagnosed learning gaps have been successfully closed.',
          ),
          suggestedQuizTopic: String(parsed.reassessment.suggestedQuizTopic || input.topic),
        }
      : {
          recommended: true,
          targetConcepts: input.weakConcepts || [input.topic],
          reason: 'Verify that previously diagnosed learning gaps have been successfully closed.',
          suggestedQuizTopic: input.topic,
        }

    return {
      id: `rev-plan-${Date.now()}`,
      studentId: input.student?.id,
      studentName: input.student?.name,
      topic: input.topic,
      subject: input.subject,
      title,
      overallGoal,
      currentMastery: mastery,
      recommendedTier,
      durationDays,
      priorityAreas,
      dailyPlans,
      reassessment,
      generatedAt: new Date().toISOString(),
    }
  } catch (err) {
    console.error('[GEMINI-REVISION-PLAN-PARSE-ERROR] Raw text:', rawJson)
    throw new Error('Failed to parse structured JSON personalized revision plan from Gemini.')
  }
}

// -------------------------------------------------------------
// Real AI Teacher Assistant & Classroom Insights Engine
// -------------------------------------------------------------
import type {
  ClassroomInsightsResult,
  ClassroomMisconception,
  ClassroomTeachingRecommendation,
  ClassroomStudentInsight,
} from './types'

export interface ClassroomInsightsInput {
  classId: string
  className: string
  topic: string
  subject?: string
  grade?: string
  learningObjective?: string
  curriculum?: string
  classAggregates: {
    totalStudents: number
    overallMastery: number
    averageAssessmentScore: number
    strugglingCount: number
    onTrackCount: number
    advancedCount: number
    conceptBreakdown: Array<{
      concept: string
      accuracy: number
      attempts: number
    }>
  }
  studentProfiles: Array<{
    id: string
    name: string
    tier: LearningLevel
    topicMastery: number
    quizAverage: number
    weakConcepts: string[]
    strongConcepts: string[]
    diagnosedGaps: string[]
  }>
  misconceptionsObserved: Array<{
    concept: string
    misconception: string
    affectedStudentsCount: number
  }>
  materialAnalysisContext?: {
    coreConcepts?: string[]
    prerequisites?: string[]
    commonMisconceptions?: string[]
    learningOutcomes?: string[]
  }
}

export async function generateClassroomInsightsWithGemini(
  input: ClassroomInsightsInput,
): Promise<ClassroomInsightsResult> {
  const { classAggregates, studentProfiles, className, topic } = input

  const systemPrompt = `You are TeachAI Master Pedagogical Strategist and Classroom Data Analyst.
Your role is to serve as an intelligent decision-support assistant for a teacher.
Analyze real classroom performance evidence and synthesize evidence-grounded insights, identify class-wide conceptual hurdles and common misconceptions, and generate practical teaching recommendations.

CRITICAL RULES:
- Ground every key finding and recommendation in the provided classroom data. Distinguish between verified evidence and pedagogical hypotheses.
- Identify the primary class-wide conceptual bottlenecks.
- Common Misconceptions: Identify recurring misconceptions observed in the class, explain the underlying confusion, and suggest an actionable classroom correction (e.g. comparison example, physical analogy, counter-example).
- Teaching Recommendations: Provide practical, actionable teaching strategies (reteach, small group intervention, visual diagram, peer learning, diagnostic quiz) with direct reasons grounded in class data.
- Differentiated Strategy: Provide concrete, level-appropriate teaching tracks:
    * Remedial: prerequisite review, guided worked examples, scaffolded practice.
    * Standard: independent application, conceptual discrimination, problem-solving.
    * Advanced: higher-order challenges, edge cases, extension activities.
- Next Steps: Outline 3 clear, sequential action steps for the teacher to execute this week.

Return STRICT JSON matching this schema:
{
  "keyFindings": [
    { "finding": string, "evidence": string, "severity": "High" | "Medium" | "Low" }
  ],
  "commonMisconceptions": [
    { "concept": string, "misconception": string, "evidence": string, "confidence": "High" | "Medium" | "Low", "suggestedCorrection": string }
  ],
  "teachingRecommendations": [
    { "priority": "High" | "Medium" | "Low", "action": string, "reason": string, "targetGroup": "All" | "Remedial" | "Standard" | "Advanced", "suggestedFeatureLink": string }
  ],
  "differentiation": {
    "remedial": string[],
    "standard": string[],
    "advanced": string[]
  },
  "nextSteps": string[],
  "trendAnalysis": string
}`

  let userContext = `Analyze the following classroom performance data for class "${className}" on topic "${topic}":
- Subject: ${input.subject || 'Academic Subject'}
- Grade / Level: ${input.grade || 'Grade 10'}
- Curriculum: ${input.curriculum || 'Standard Academic Curriculum'}
- Learning Objective: ${input.learningObjective || `Mastery of ${topic}`}

--- DETERMINISTIC CLASS AGGREGATES ---
- Total Enrolled Students Analyzed: ${classAggregates.totalStudents}
- Class Average Mastery: ${classAggregates.overallMastery}%
- Average Assessment Score: ${classAggregates.averageAssessmentScore}%
- Struggling Students (<60% mastery): ${classAggregates.strugglingCount} (${Math.round((classAggregates.strugglingCount / Math.max(classAggregates.totalStudents, 1)) * 100)}%)
- On-Track Students (60-79% mastery): ${classAggregates.onTrackCount} (${Math.round((classAggregates.onTrackCount / Math.max(classAggregates.totalStudents, 1)) * 100)}%)
- Advanced Students (>=80% mastery): ${classAggregates.advancedCount} (${Math.round((classAggregates.advancedCount / Math.max(classAggregates.totalStudents, 1)) * 100)}%)`

  if (classAggregates.conceptBreakdown.length > 0) {
    userContext += `\n\n--- CONCEPT-LEVEL PERFORMANCE BREAKDOWN ---`
    classAggregates.conceptBreakdown.forEach((cb) => {
      userContext += `\n* ${cb.concept}: ${cb.accuracy}% accuracy across ${cb.attempts} assessment attempts`
    })
  }

  if (input.misconceptionsObserved.length > 0) {
    userContext += `\n\n--- FREQUENTLY OBSERVED COGNITIVE MISCONCEPTIONS ---`
    input.misconceptionsObserved.forEach((m) => {
      userContext += `\n* Concept: ${m.concept} | Misconception: "${m.misconception}" (Identified in ${m.affectedStudentsCount} student responses)`
    })
  }

  userContext += `\n\n--- ANONYMIZED STUDENT PROFILES (Sample) ---`
  studentProfiles.slice(0, 15).forEach((sp, idx) => {
    userContext += `\n* Student ${idx + 1} (${sp.name.split(' ')[0]}): Mastery ${sp.topicMastery}%, Quiz Avg ${sp.quizAverage}%, Tier: ${sp.tier}`
    if (sp.weakConcepts.length > 0) userContext += ` | Weak: ${sp.weakConcepts.join(', ')}`
    if (sp.diagnosedGaps.length > 0) userContext += ` | Gaps: ${sp.diagnosedGaps.join('; ')}`
  })

  if (input.materialAnalysisContext) {
    const mac = input.materialAnalysisContext
    userContext += `\n\n--- MATERIAL ANALYSIS KNOWLEDGE GRAPH ---`
    if (mac.coreConcepts?.length) userContext += `\nCore Concepts: ${mac.coreConcepts.join(', ')}`
    if (mac.prerequisites?.length) userContext += `\nPrerequisites: ${mac.prerequisites.join(', ')}`
    if (mac.commonMisconceptions?.length) userContext += `\nDocumented Curriculum Misconceptions: ${mac.commonMisconceptions.join(', ')}`
  }

  userContext += `\n\nSynthesize evidence-based classroom insights, identify common misconceptions with corrections, and provide actionable teaching recommendations.`

  const rawJson = await callGeminiModels(systemPrompt, userContext)

  try {
    const parsed = extractJsonFromText<any>(rawJson)

    const keyFindings = Array.isArray(parsed.keyFindings)
      ? parsed.keyFindings.map((kf: any) => ({
          finding: String(kf.finding || 'Classroom performance observation'),
          evidence: String(kf.evidence || 'Assessment response patterns'),
          severity: kf.severity === 'High' || kf.severity === 'Low' ? kf.severity : 'Medium',
        }))
      : [
          {
            finding: `Performance varies across ${topic} sub-concepts.`,
            evidence: `${classAggregates.strugglingCount} students currently score below 60% mastery.`,
            severity: 'High',
          },
        ]

    const commonMisconceptions: ClassroomMisconception[] = Array.isArray(parsed.commonMisconceptions)
      ? parsed.commonMisconceptions.map((cm: any) => ({
          concept: String(cm.concept || topic),
          misconception: String(cm.misconception || 'Conceptual confusion identified in assessments'),
          evidence: String(cm.evidence || 'Identified from quiz error frequency'),
          confidence: cm.confidence === 'Medium' || cm.confidence === 'Low' ? cm.confidence : 'High',
          suggestedCorrection: String(
            cm.suggestedCorrection ||
              'Demonstrate a worked counter-example contrasting the rule with common errors.',
          ),
        }))
      : input.misconceptionsObserved.map((m) => ({
          concept: m.concept,
          misconception: m.misconception,
          evidence: `Observed in ${m.affectedStudentsCount} student assessments.`,
          confidence: 'High',
          suggestedCorrection: 'Reteach using visual concept mapping.',
        }))

    const teachingRecommendations: ClassroomTeachingRecommendation[] = Array.isArray(
      parsed.teachingRecommendations,
    )
      ? parsed.teachingRecommendations.map((tr: any) => ({
          priority: tr.priority === 'High' || tr.priority === 'Low' ? tr.priority : 'Medium',
          action: String(tr.action || 'Reteach foundational concepts'),
          reason: String(tr.reason || 'Evidence indicates student confusion'),
          targetGroup:
            tr.targetGroup === 'Remedial' ||
            tr.targetGroup === 'Standard' ||
            tr.targetGroup === 'Advanced'
              ? tr.targetGroup
              : 'All',
          suggestedFeatureLink: String(tr.suggestedFeatureLink || '/teacher/lesson-plans'),
        }))
      : [
          {
            priority: 'High',
            action: `Reteach core ${topic} concepts using step-by-step worked examples.`,
            reason: `${classAggregates.strugglingCount} students need scaffolding to reach 60% mastery.`,
            targetGroup: 'Remedial',
            suggestedFeatureLink: '/teacher/lesson-plans',
          },
        ]

    const differentiation = {
      remedial:
        Array.isArray(parsed.differentiation?.remedial) && parsed.differentiation.remedial.length > 0
          ? parsed.differentiation.remedial.map(String)
          : [
              'Review prerequisite definitions and dependency diagrams.',
              'Provide guided practice with immediate corrective hints.',
            ],
      standard:
        Array.isArray(parsed.differentiation?.standard) && parsed.differentiation.standard.length > 0
          ? parsed.differentiation.standard.map(String)
          : [
              'Independent practice with multi-step application problems.',
              'Formative quiz to verify standard mastery.',
            ],
      advanced:
        Array.isArray(parsed.differentiation?.advanced) && parsed.differentiation.advanced.length > 0
          ? parsed.differentiation.advanced.map(String)
          : [
              'Higher-order case studies and edge-case schema proofs.',
              'Peer mentoring sessions with remedial classmates.',
            ],
    }

    const nextSteps = Array.isArray(parsed.nextSteps)
      ? parsed.nextSteps.map(String)
      : [
          `Review the weakest sub-concept in the next class session.`,
          `Distribute differentiated practice using the 3-tier adaptive tracks.`,
          `Run a formative reassessment quiz to measure learning gain.`,
        ]

    const trendAnalysis =
      typeof parsed.trendAnalysis === 'string' && parsed.trendAnalysis.trim()
        ? parsed.trendAnalysis.trim()
        : `Assessment trends indicate steady progression in core definitions, with ${classAggregates.strugglingCount} students requiring intervention on complex application problems.`

    // Deterministically categorize students into groups
    const remedialStudents: ClassroomStudentInsight[] = []
    const standardStudents: ClassroomStudentInsight[] = []
    const advancedStudents: ClassroomStudentInsight[] = []
    const interventionStudents: ClassroomStudentInsight[] = []

    studentProfiles.forEach((sp) => {
      const insightStudent: ClassroomStudentInsight = {
        id: sp.id,
        name: sp.name,
        mastery: sp.topicMastery,
        quizAverage: sp.quizAverage,
        tier: sp.tier,
        weakConcepts: sp.weakConcepts,
        needsIntervention: sp.topicMastery < 50 || sp.diagnosedGaps.length >= 2,
      }

      if (sp.tier === 'Remedial' || sp.topicMastery < 60) {
        remedialStudents.push(insightStudent)
      } else if (sp.tier === 'Advanced' || sp.topicMastery >= 80) {
        advancedStudents.push(insightStudent)
      } else {
        standardStudents.push(insightStudent)
      }

      if (insightStudent.needsIntervention) {
        interventionStudents.push(insightStudent)
      }
    })

    return {
      id: `cls-ins-${Date.now()}`,
      classId: input.classId,
      className,
      topic,
      subject: input.subject,
      generatedAt: new Date().toISOString(),
      classSummary: {
        overallMastery: classAggregates.overallMastery,
        averageAssessmentScore: classAggregates.averageAssessmentScore,
        studentsAnalyzed: classAggregates.totalStudents,
        strugglingCount: classAggregates.strugglingCount,
        onTrackCount: classAggregates.onTrackCount,
        advancedCount: classAggregates.advancedCount,
      },
      keyFindings,
      commonMisconceptions,
      studentGroups: {
        remedial: remedialStudents,
        standard: standardStudents,
        advanced: advancedStudents,
        intervention: interventionStudents,
      },
      teachingRecommendations,
      differentiation,
      nextSteps,
      trendAnalysis,
    }
  } catch (err) {
    console.error('[GEMINI-CLASSROOM-INSIGHTS-PARSE-ERROR] Raw text:', rawJson)
    throw new Error('Failed to parse structured JSON classroom insights from Gemini.')
  }
}

