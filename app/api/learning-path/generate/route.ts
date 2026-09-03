import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth/session'
import { getPrisma } from '@/lib/db/prisma'
import { generateCourseLearningPathWithGemini, type CourseLearningPathInput } from '@/lib/gemini'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession()
    const prisma = getPrisma()
    const body = await req.json()

    const sourceType: 'uploaded_pdf' | 'class_lesson' | 'demo' = body.sourceType || 'uploaded_pdf'
    const materialId = body.materialId?.trim()
    const classId = body.classId?.trim()
    const lessonPlanId = body.lessonPlanId?.trim()
    let rawContent = body.rawContent?.trim() || ''
    let subject = body.subject?.trim() || ''
    let courseTitle = body.courseTitle?.trim() || body.topic?.trim() || ''
    let sourceName = body.sourceName?.trim() || 'Uploaded Course Material'
    const targetAudience = body.targetAudience?.trim() || 'Secondary / Undergraduate Learners'

    // -------------------------------------------------------------
    // SOURCE A: Uploaded PDF / Course Material
    // -------------------------------------------------------------
    if (sourceType === 'uploaded_pdf') {
      if (materialId && prisma) {
        const material = await prisma.material.findUnique({
          where: { id: materialId },
        })
        if (material) {
          if (!rawContent && material.rawText) rawContent = material.rawText
          if (!subject && material.subject) subject = material.subject
          if (!courseTitle && material.topic) courseTitle = material.topic
          if (!sourceName && material.name) sourceName = material.name
          if (!courseTitle && material.name) courseTitle = material.name.replace(/\.pdf$/i, '')
        }
      }

      // Strict validation: Must have readable content from the uploaded PDF
      if (!rawContent || rawContent.length < 20) {
        return NextResponse.json(
          {
            success: false,
            error:
              'No readable course material was provided. Please upload a course material PDF.',
          },
          { status: 400 },
        )
      }

      if (!subject) subject = 'General Course'
      if (!courseTitle) courseTitle = sourceName.replace(/\.pdf$/i, '') || 'Course Curriculum'
    }

    // -------------------------------------------------------------
    // SOURCE B: Teacher's Class / Lesson Content from Database
    // -------------------------------------------------------------
    else if (sourceType === 'class_lesson') {
      if (lessonPlanId && prisma) {
        const lp = await prisma.lessonPlan.findUnique({
          where: { id: lessonPlanId },
          include: { class: true },
        })
        if (lp) {
          courseTitle = lp.title
          subject = lp.subject
          sourceName = `Class Lesson: ${lp.title}`
          const contentStr = typeof lp.content === 'string' ? lp.content : JSON.stringify(lp.content)
          rawContent = `Subject: ${lp.subject}\nTopic: ${lp.topic}\nObjective: ${lp.learningObjective}\n\nContent:\n${contentStr}`
        }
      } else if (classId && prisma) {
        const cls = await prisma.class.findUnique({
          where: { id: classId },
          include: { topics: true },
        })
        if (cls) {
          courseTitle = `${cls.subject} (${cls.name})`
          subject = cls.subject
          sourceName = `Class Syllabus: ${cls.name}`
          const topicsList = cls.topics.map((t, idx) => `${idx + 1}. ${t.title}`).join('\n')
          rawContent = `Class: ${cls.name}\nSubject: ${cls.subject}\nDepartment: ${cls.department || 'Academic'}\n\nSyllabus Units:\n${topicsList}`
        }
      }

      if (!rawContent || rawContent.length < 20) {
        return NextResponse.json(
          {
            success: false,
            error: 'No class syllabus or lesson records found. Please set up your class topics first.',
          },
          { status: 404 },
        )
      }
    }

    // -------------------------------------------------------------
    // SOURCE C: Explicit Hackathon Demo Mode
    // -------------------------------------------------------------
    else if (sourceType === 'demo') {
      courseTitle = 'Database Management Systems'
      subject = 'Computer Science'
      sourceName = 'DBMS Showcase Curriculum (Built-in Demo)'
      rawContent = `Course: Database Management Systems
Modules:
Module 1: Relational Model & SQL Fundamentals
Module 2: Conceptual ER Modeling & Cardinality Constraints
Module 3: Normalization (1NF, 2NF, 3NF, BCNF)
Module 4: Transaction Processing, ACID properties & Concurrency Control
Module 5: Storage Structures & Indexing (B+ Trees)`
    }

    // Call real Gemini AI course learning path generator
    const learningPathInput: CourseLearningPathInput = {
      courseTitle: courseTitle || 'Course Curriculum',
      subject: subject || 'Academic Course',
      targetAudience,
      sourceType,
      sourceName,
      sourceContent: rawContent,
      materialId,
    }

    const learningPath = await generateCourseLearningPathWithGemini(learningPathInput)

    return NextResponse.json({
      success: true,
      learningPath,
    })
  } catch (error) {
    console.error('[LEARNING PATH GENERATION ERROR]:', error)
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to generate course learning path with Gemini AI.',
      },
      { status: 500 },
    )
  }
}
