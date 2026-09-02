import { NextRequest, NextResponse } from 'next/server'
import { createMaterial, listMaterials } from '@/lib/services/material-service'

export async function GET() {
  try {
    const materials = await listMaterials()
    return NextResponse.json({ success: true, materials })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to list materials' },
      { status: 500 },
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || ''

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData()
      const file = formData.get('file') as File | null
      const subject = (formData.get('subject') as string) || 'Database Management Systems'
      const topic = (formData.get('topic') as string) || 'ER Model'
      const name = (formData.get('name') as string) || (file ? file.name : 'Uploaded Material')

      let fileBuffer: Buffer | undefined
      let mimeType: string | undefined

      if (file) {
        const arrayBuf = await file.arrayBuffer()
        fileBuffer = Buffer.from(arrayBuf)
        mimeType = file.type
      }

      const ext = name.split('.').pop()?.toLowerCase() || ''
      const type = ext === 'pdf' ? 'PDF' : ext.includes('ppt') ? 'Slides' : ext.includes('doc') ? 'Document' : 'PDF'

      const created = await createMaterial({
        name,
        subject,
        topic,
        type,
        fileBuffer,
        mimeType,
      })

      return NextResponse.json({ success: true, material: created })
    }

    // JSON payload
    const body = await req.json()
    const created = await createMaterial({
      name: body.name || 'New Material',
      subject: body.subject || 'General',
      topic: body.topic || 'General Topic',
      type: body.type || 'PDF',
    })

    return NextResponse.json({ success: true, material: created })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to create material' },
      { status: 500 },
    )
  }
}
