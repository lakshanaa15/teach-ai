import { callGeminiWithInlineData, detectSubjectAndTopicWithGemini } from '@/lib/gemini'

export interface ExtractedTextResult {
  fileName: string
  fileType: string
  content: string
  charCount: number
  metadata?: Record<string, any>
}

export async function extractTextFromFile(
  fileBuffer: ArrayBuffer | Buffer,
  fileName: string,
  mimeType: string,
): Promise<ExtractedTextResult> {
  const ext = fileName.split('.').pop()?.toLowerCase() || ''
  const buffer = Buffer.isBuffer(fileBuffer) ? fileBuffer : Buffer.from(fileBuffer)

  // 1. Plain text / Markdown handling
  if (ext === 'txt' || ext === 'md' || mimeType.includes('text')) {
    const text = buffer.toString('utf-8').trim()
    if (!text) {
      throw new Error(`The uploaded text file "${fileName}" is empty. Please provide a document with educational content.`)
    }
    return {
      fileName,
      fileType: ext || 'text',
      content: text,
      charCount: text.length,
      metadata: {
        originalSize: buffer.byteLength,
        mimeType,
      },
    }
  }

  // 2. Real PDF extraction
  if (ext === 'pdf' || mimeType.includes('pdf')) {
    let extractedText = ''
    let numPages = 1

    // Step A: Attempt text-layer extraction via pdf-parse
    try {
      // Lazy load pdf-parse for Next.js server compatibility
      const pdfParse = require('pdf-parse')
      const pdfData = await pdfParse(buffer)
      if (pdfData && typeof pdfData.text === 'string') {
        extractedText = pdfData.text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
        numPages = pdfData.numpages || 1
      }
    } catch (parseErr) {
      console.warn('[PDF-PARSE-WARNING] Fast text-layer extraction failed, trying multimodal OCR:', parseErr)
    }

    // Step B: If text-layer extraction extracted meaningful text (>= 50 chars), return it
    if (extractedText.length >= 50) {
      return {
        fileName,
        fileType: 'pdf',
        content: extractedText,
        charCount: extractedText.length,
        metadata: {
          pages: numPages,
          originalSize: buffer.byteLength,
          mimeType: 'application/pdf',
          extractionEngine: 'pdf-parse',
        },
      }
    }

    // Step C: If pdf-parse returned < 50 chars (scanned image, vector diagram, or scanned lecture notes),
    // invoke Gemini's native PDF multimodal engine to transcribe text, formulas, and diagrams
    try {
      console.log(`[TEXT-EXTRACTOR] PDF "${fileName}" has minimal text layer (${extractedText.length} chars). Invoking Gemini multimodal OCR...`)
      const base64Pdf = buffer.toString('base64')
      const systemPrompt = `You are TeachAI High-Precision Academic Document Transcriber. Extract all readable pedagogical text, sections, learning objectives, definitions, formulas, exercises, problem statements, and curriculum content from this PDF.
Preserve exact terminology, mathematical notation, headers, and code blocks.
Do NOT summarize. Transcribe the actual educational text from the document.`

      const userPrompt = `Extract the complete pedagogical text from this uploaded document "${fileName}".`

      const ocrResult = await callGeminiWithInlineData(systemPrompt, userPrompt, {
        mimeType: 'application/pdf',
        data: base64Pdf,
      })

      const cleanedOcr = (ocrResult || '').trim()
      if (cleanedOcr.length >= 30) {
        return {
          fileName,
          fileType: 'pdf',
          content: cleanedOcr,
          charCount: cleanedOcr.length,
          metadata: {
            originalSize: buffer.byteLength,
            mimeType: 'application/pdf',
            extractionEngine: 'gemini-multimodal-ocr',
          },
        }
      }
    } catch (ocrErr) {
      console.warn('[TEXT-EXTRACTOR] Gemini multimodal PDF extraction error:', ocrErr)
    }

    // If both failed and we had at least some sparse text, use it; otherwise throw a clear error
    if (extractedText.length >= 20) {
      return {
        fileName,
        fileType: 'pdf',
        content: extractedText,
        charCount: extractedText.length,
        metadata: {
          originalSize: buffer.byteLength,
          mimeType: 'application/pdf',
          extractionEngine: 'pdf-parse-sparse',
        },
      }
    }

    throw new Error(
      `Unable to extract readable content from "${fileName}". Please ensure the PDF is not password-protected or corrupted, and contains readable lesson/course material.`,
    )
  }

  // 3. Fallback for unrecognized binary types
  throw new Error(`Unsupported file type for "${fileName}". Please upload a PDF document (.pdf) or text file.`)
}

export async function detectSubjectAndTopic(
  content: string,
  fileName?: string,
): Promise<{ subject: string; topic: string }> {
  return detectSubjectAndTopicWithGemini(content, fileName)
}
