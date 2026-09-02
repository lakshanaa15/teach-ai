import { getPrisma } from '@/lib/db/prisma'
import { materials as mockMaterials } from '@/lib/mock-data'
import type { Material, MaterialAnalysis } from '@/lib/types'
import { analyzeMaterial as aiAnalyzeMaterial } from '@/lib/ai-service'
import { extractTextFromFile } from './text-extractor'

export async function listMaterials(): Promise<Material[]> {
  const prisma = getPrisma()
  if (prisma) {
    try {
      const records = await prisma.material.findMany({
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
          rawText: extractedText || undefined,
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
  }

  return newMaterial
}

export async function analyzeMaterialService(
  materialNameOrTopic: string,
  topic: string,
): Promise<MaterialAnalysis> {
  const analysis = await aiAnalyzeMaterial(materialNameOrTopic, topic)

  const prisma = getPrisma()
  if (prisma) {
    try {
      await prisma.materialAnalysis.create({
        data: {
          topic: analysis.topic,
          subject: analysis.subject,
          detectedConcepts: analysis.detectedConcepts,
          difficulty: analysis.difficulty as any,
          prerequisites: analysis.prerequisites,
          commonMisconceptions: analysis.commonMisconceptions,
          learningOutcomes: analysis.learningOutcomes,
          approvalStatus: analysis.approvalStatus as any,
        },
      })
    } catch (e) {
      console.warn('Could not save analysis to database, returning AI result:', e)
    }
  }

  return analysis
}
