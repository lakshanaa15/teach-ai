import { NextRequest, NextResponse } from 'next/server'
import { createMaterial, listMaterials } from '@/lib/services/material-service'
import { getServerSession } from '@/lib/auth/session'
import { getPrisma } from '@/lib/db/prisma'
import fs from 'fs/promises'
import path from 'path'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession()
    const prisma = getPrisma()
    const classIdParam = req.nextUrl.searchParams.get('classId')

    if (session?.role === 'STUDENT' && prisma) {
      const student = await prisma.student.findFirst({
        where: { userId: session.userId },
        include: { enrollments: { select: { classId: true } } },
      })
      const enrolledClassIds = student?.enrollments.map((e) => e.classId) || []
      const materials = await listMaterials({
        studentEnrolledClassIds: enrolledClassIds,
      })
      return NextResponse.json({ success: true, materials })
    }

    if (session?.role === 'TEACHER' && prisma) {
      let teacherId = session.teacherId
      if (!teacherId || teacherId === 't-1') {
        const teacher = await prisma.teacher.findFirst({
          where: { userId: session.userId },
        })
        if (teacher) teacherId = teacher.id
      }
      const materials = await listMaterials({
        teacherId,
        classId: classIdParam || undefined,
      })
      return NextResponse.json({ success: true, materials })
    }

    const materials = await listMaterials({
      classId: classIdParam || undefined,
    })
    return NextResponse.json({ success: true, materials })
  } catch (error) {
    console.error('[GET MATERIALS ERROR]:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to list materials' },
      { status: 500 },
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session || session.role !== 'TEACHER') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Teacher authentication required.' },
        { status: 403 },
      )
    }

    const prisma = getPrisma()
    let teacherId = session.teacherId
    if (prisma && (!teacherId || teacherId === 't-1')) {
      const teacher = await prisma.teacher.findFirst({
        where: { userId: session.userId },
      })
      if (teacher) teacherId = teacher.id
    }

    const contentType = req.headers.get('content-type') || ''

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData()
      const file = formData.get('file') as File | null
      let subject = (formData.get('subject') as string)?.trim()
      let topic = (formData.get('topic') as string)?.trim()
      const classId = (formData.get('classId') as string) || undefined
      const lessonPlanId = (formData.get('lessonPlanId') as string) || undefined
      const name = (formData.get('name') as string) || (file ? file.name : 'Uploaded Material')

      if (!file) {
        return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 })
      }

      // Validate file extension and MIME type
      const ext = (name.split('.').pop() || '').toLowerCase()
      const isPdf = ext === 'pdf' || file.type.includes('pdf')

      if (!isPdf) {
        return NextResponse.json(
          { success: false, error: 'Only PDF files (.pdf) are supported.' },
          { status: 400 },
        )
      }

      // Validate file size limit (50MB)
      const maxSizeBytes = 50 * 1024 * 1024
      if (file.size > maxSizeBytes) {
        return NextResponse.json(
          { success: false, error: 'File exceeds the 50MB size limit.' },
          { status: 400 },
        )
      }

      // Read array buffer and prepare file buffer
      const arrayBuf = await file.arrayBuffer()
      const fileBuffer = Buffer.from(arrayBuf)

      // Extract real text from PDF
      const { extractTextFromFile, detectSubjectAndTopic } = await import('@/lib/services/text-extractor')
      const extraction = await extractTextFromFile(fileBuffer, name, file.type || 'application/pdf')
      const extractedText = extraction.content

      // If subject or topic are not specified, infer them from the actual document content
      if (!subject || !topic || topic === 'General Topic' || topic === 'General') {
        try {
          const detected = await detectSubjectAndTopic(extractedText, name)
          if (!subject || subject === 'Database Management Systems') subject = detected.subject
          if (!topic || topic === 'General Topic' || topic === 'General') topic = detected.topic
        } catch (detectErr) {
          console.warn('[MATERIAL-UPLOAD] Subject/topic detection warning:', detectErr)
          if (!subject) subject = 'General Course'
          if (!topic) topic = name.replace(/\.pdf$/i, '')
        }
      }

      // Persist PDF to disk in public/uploads/
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
      await fs.mkdir(uploadsDir, { recursive: true })

      const safeFilename = `${Date.now()}-${name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
      const diskPath = path.join(uploadsDir, safeFilename)
      await fs.writeFile(diskPath, fileBuffer)

      const fileUrl = `/uploads/${safeFilename}`

      const created = await createMaterial({
        name,
        subject: subject || 'General Course',
        topic: topic || name.replace(/\.pdf$/i, ''),
        type: 'PDF',
        fileBuffer,
        mimeType: file.type || 'application/pdf',
        fileUrl,
        teacherId,
        classId,
        lessonPlanId,
      })

      return NextResponse.json({
        success: true,
        message: 'PDF uploaded and processed successfully.',
        material: created,
        extractedLength: extractedText.length,
      })
    }

    // JSON fallback
    const body = await req.json()
    const created = await createMaterial({
      name: body.name || 'New Material',
      subject: body.subject || 'General',
      topic: body.topic || 'General Topic',
      type: body.type || 'PDF',
      teacherId,
      classId: body.classId,
      lessonPlanId: body.lessonPlanId,
    })

    return NextResponse.json({ success: true, material: created })
  } catch (error) {
    console.error('[UPLOAD MATERIAL ERROR]:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unable to upload the PDF. Please check the file and try again.',
      },
      { status: 500 },
    )
  }
}
