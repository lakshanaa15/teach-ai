import { getPrisma } from '@/lib/db/prisma'
import { materials as mockMaterials } from '@/lib/mock-data'
import type { Material, MaterialAnalysis } from '@/lib/types'
import { analyzeMaterialWithGemini } from '@/lib/gemini'
import { extractTextFromFile } from './text-extractor'

export async function listMaterials(options?: {
  teacherId?: string
  classId?: string
  studentEnrolledClassIds?: string[]
}): Promise<Material[]> {
  const prisma = getPrisma()
  if (prisma) {
    try {
      const where: any = {}
      if (options?.classId) {
        where.classId = options.classId
      } else if (options?.studentEnrolledClassIds && options.studentEnrolledClassIds.length > 0) {
        where.OR = [
          { classId: { in: options.studentEnrolledClassIds } },
          { classId: null },
        ]
      } else if (options?.teacherId) {
        where.teacherId = options.teacherId
      }

      const records = await prisma.material.findMany({
        where: Object.keys(where).length > 0 ? where : undefined,
        orderBy: { createdAt: 'desc' },
      })
      if (records && records.length > 0) {
        return records.map((r: any) => ({
          id: r.id,
          name: r.name,
          subject: r.subject,
          topic: r.topic,
          type: r.type as Material['type'],
          date: r.createdAt.toISOString().split('T')[0],
          status: r.status as Material['status'],
          sizeKb: r.sizeKb,
          fileUrl: r.fileUrl || undefined,
          classId: r.classId || undefined,
          lessonPlanId: r.lessonPlanId || undefined,
        }))
      }
    } catch (e) {
      console.warn('Prisma query failed, falling back to mock:', e)
    }
  }
  return mockMaterials
}

export async function createMaterial(params: {
  name: string
  subject: string
  topic: string
  type: Material['type']
  fileBuffer?: ArrayBuffer | Buffer
  mimeType?: string
  fileUrl?: string
  teacherId?: string
  classId?: string
  lessonPlanId?: string
}): Promise<Material> {
  const prisma = getPrisma()
  let extractedText = ''

  if (params.fileBuffer) {
    const extracted = await extractTextFromFile(
      params.fileBuffer,
      params.name,
      params.mimeType || 'application/octet-stream',
    )
    extractedText = extracted.content
  }

  const sizeKb = params.fileBuffer
    ? Math.round(params.fileBuffer.byteLength / 1024)
    : Math.floor(Math.random() * 2000) + 1200

  if (prisma) {
    try {
      const created = await prisma.material.create({
        data: {
          name: params.name,
          subject: params.subject,
          topic: params.topic,
          type: params.type as any,
          status: 'Processed',
          sizeKb,
          fileUrl: params.fileUrl || null,
          rawText: extractedText || undefined,
          teacherId: params.teacherId || null,
          classId: params.classId || null,
          lessonPlanId: params.lessonPlanId || null,
        },
      })
      return {
        id: created.id,
        name: created.name,
        subject: created.subject,
        topic: created.topic,
        type: created.type as Material['type'],
        date: created.createdAt.toISOString().split('T')[0],
        status: created.status as Material['status'],
        sizeKb: created.sizeKb,
        fileUrl: created.fileUrl || undefined,
        rawText: created.rawText || extractedText || undefined,
        classId: created.classId || undefined,
        lessonPlanId: created.lessonPlanId || undefined,
      }
    } catch (e) {
      console.warn('Prisma material creation failed, falling back to mock:', e)
    }
  }

  // In-memory fallback
  const newMaterial: Material = {
    id: `mat-${Date.now()}`,
    name: params.name,
    subject: params.subject,
    topic: params.topic,
    type: params.type,
    date: new Date().toISOString().split('T')[0],
    status: 'Processed',
    sizeKb,
    fileUrl: params.fileUrl,
    rawText: extractedText || undefined,
    classId: params.classId,
    lessonPlanId: params.lessonPlanId,
  }

  return newMaterial
}

export async function analyzeMaterialService(
  materialNameOrTopic: string,
  topic: string,
  metadata?: {
    subject?: string
    grade?: string
    curriculum?: string
    content?: string
    materialId?: string
  },
): Promise<MaterialAnalysis> {
  const prisma = getPrisma()
  let rawText = metadata?.content
  let subject = metadata?.subject
  let targetMaterialId = metadata?.materialId

  // Attempt to enrich with stored DB material info if available
  if (prisma && (!rawText || !subject)) {
    try {
      const existingMat = await prisma.material.findFirst({
        where: targetMaterialId ? { id: targetMaterialId } : { topic },
        orderBy: { createdAt: 'desc' },
      })
      if (existingMat) {
        if (!rawText && existingMat.rawText) rawText = existingMat.rawText
        if (!subject && existingMat.subject) subject = existingMat.subject
        if (!targetMaterialId) targetMaterialId = existingMat.id
      }
    } catch (e) {
      console.warn('Could not fetch material record from database:', e)
    }
  }

  // Call REAL Google Gemini AI to analyze the material
  const geminiResult = await analyzeMaterialWithGemini({
    subject: subject || 'General Subject',
    grade: metadata?.grade || 'Standard Secondary / Undergraduate',
    topic: topic || materialNameOrTopic,
    curriculum: metadata?.curriculum || 'Standard National Curriculum',
    materialName: materialNameOrTopic,
    content: rawText,
  })

  const analysis: MaterialAnalysis = {
    materialId: targetMaterialId,
    topic: topic || geminiResult.title || materialNameOrTopic,
    subject: subject || 'General Subject',
    title: geminiResult.title,
    summary: geminiResult.summary,
    detectedConcepts: geminiResult.coreConcepts,
    coreConcepts: geminiResult.coreConcepts,
    subConcepts: geminiResult.subConcepts,
    difficulty: 'Standard',
    prerequisites: geminiResult.prerequisites,
    commonMisconceptions: geminiResult.commonMisconceptions,
    learningOutcomes: geminiResult.learningOutcomes,
    importantTopics: geminiResult.importantTopics,
    suggestedLessonTopics: geminiResult.suggestedLessonTopics,
    approvalStatus: 'Draft',
    analyzedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  }

  if (prisma) {
    try {
      await prisma.materialAnalysis.create({
        data: {
          materialId: targetMaterialId || undefined,
          topic: analysis.topic,
          subject: analysis.subject,
          detectedConcepts: analysis.detectedConcepts,
          difficulty: 'Standard',
          prerequisites: analysis.prerequisites,
          commonMisconceptions: analysis.commonMisconceptions,
          learningOutcomes: analysis.learningOutcomes,
          approvalStatus: 'Draft',
        },
      })
    } catch (e) {
      console.warn('Could not save analysis to database, returning AI result:', e)
    }
  }

  return analysis
}
