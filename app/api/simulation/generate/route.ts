import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth/session'
import { getPrisma } from '@/lib/db/prisma'
import { generateStudentSimulationWithGemini, type StudentSimulationInput } from '@/lib/gemini'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession()
    const prisma = getPrisma()
    const body = await req.json()

    const sourceType: 'uploaded_pdf' | 'class_lesson' | 'demo' = body.sourceType || 'uploaded_pdf'
    const materialId = body.materialId?.trim()
    const lessonPlanId = body.lessonPlanId?.trim()
    let rawContent = body.rawContent?.trim() || ''
    let subject = body.subject?.trim() || ''
    let topic = body.topic?.trim() || ''
    let lessonTitle = body.lessonTitle?.trim() || ''
    let sourceName = body.sourceName?.trim() || 'Uploaded Document'
    let learningObjectives = body.learningObjectives?.trim() || ''

    // -------------------------------------------------------------
    // SOURCE A: Uploaded PDF / Document
    // -------------------------------------------------------------
    if (sourceType === 'uploaded_pdf') {
      if (materialId && prisma) {
        const material = await prisma.material.findUnique({
          where: { id: materialId },
        })
        if (material) {
          if (!rawContent && material.rawText) rawContent = material.rawText
          if (!subject && material.subject) subject = material.subject
          if (!topic && material.topic) topic = material.topic
          if (!sourceName && material.name) sourceName = material.name
          if (!lessonTitle) lessonTitle = material.name.replace(/\.pdf$/i, '')
        }
      }

      // Strict validation: Must have readable content from the uploaded PDF
      if (!rawContent || rawContent.length < 20) {
        return NextResponse.json(
          {
            success: false,
            error:
              'No readable lesson plan was provided. Please upload a readable lesson-plan PDF from your computer.',
          },
          { status: 400 },
        )
      }

      if (!subject) subject = 'General Course'
      if (!topic) topic = lessonTitle || sourceName.replace(/\.pdf$/i, '') || 'Uploaded Lesson'
      if (!lessonTitle) lessonTitle = topic
    }

    // -------------------------------------------------------------
    // SOURCE B: Teacher's Class Lesson Plan from Database
    // -------------------------------------------------------------
    else if (sourceType === 'class_lesson') {
      if (lessonPlanId && prisma) {
        const lp = await prisma.lessonPlan.findUnique({
          where: { id: lessonPlanId },
          include: { class: true, materials: true },
        })
        if (lp) {
          lessonTitle = lp.title
          subject = lp.subject
          topic = lp.topic
          learningObjectives = lp.learningObjective
          sourceName = `Class Lesson Plan: ${lp.title}`
          const contentStr = typeof lp.content === 'string' ? lp.content : JSON.stringify(lp.content)
          rawContent = `Learning Objective: ${lp.learningObjective}\n\nContent:\n${contentStr}`
        }
      } else if (topic && prisma) {
        const lp = await prisma.lessonPlan.findFirst({
          where: { topic },
          orderBy: { createdAt: 'desc' },
        })
        if (lp) {
          lessonTitle = lp.title
          subject = lp.subject
          topic = lp.topic
          learningObjectives = lp.learningObjective
          sourceName = `Class Lesson Plan: ${lp.title}`
          const contentStr = typeof lp.content === 'string' ? lp.content : JSON.stringify(lp.content)
          rawContent = `Learning Objective: ${lp.learningObjective}\n\nContent:\n${contentStr}`
        }
      }

      if (!rawContent || rawContent.length < 20) {
        return NextResponse.json(
          {
            success: false,
            error: `No approved lesson plan found for topic "${topic || 'selected'}". Please create or approve a lesson plan first.`,
          },
          { status: 404 },
        )
      }
    }

    // -------------------------------------------------------------
    // SOURCE C: Explicit Hackathon Demo Mode
    // -------------------------------------------------------------
    else if (sourceType === 'demo') {
      subject = 'Database Management Systems'
      topic = 'ER Model — Entity, Attribute, Cardinality'
      lessonTitle = 'Conceptual Database Design: ER Modeling'
      sourceName = 'DBMS ER Model Demo Lesson (Built-in Showcase)'
      learningObjectives =
        'Understand entity sets, key attributes, multi-valued attributes, 1:1, 1:N, M:N cardinality ratios, and relational junction table schema mapping.'
      rawContent = `Course: Database Management Systems
Topic: ER Modeling & Cardinality Constraints
Overview:
An Entity-Relationship Model (ER Model) is a high-level conceptual data model diagram.
Key Entities: Students, Courses, Instructors.
Attributes: Primary keys, composite attributes, multi-valued attributes (skills).
Relationships: Many-to-Many enrollment relationship requires a bridge / junction table containing foreign keys to both parent tables.
Common Pitfalls: Placing a single foreign key inside one entity during M:N mapping; confusing partial keys with primary keys in weak entities.`
    }

    // Call real Gemini AI student simulation engine
    const simulationInput: StudentSimulationInput = {
      lessonTitle: lessonTitle || topic,
      subject,
      topic,
      sourceType,
      sourceName,
      sourceContent: rawContent,
      learningObjectives,
    }

    const result = await generateStudentSimulationWithGemini(simulationInput)

    // Append materialId if applicable
    if (materialId) {
      result.sourceMetadata.materialId = materialId
    }

    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error) {
    console.error('[SIMULATION GENERATION ERROR]:', error)
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to generate student simulation with Gemini AI.',
      },
      { status: 500 },
    )
  }
}
