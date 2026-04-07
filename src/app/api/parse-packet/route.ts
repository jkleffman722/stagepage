import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { PACKET_SECTIONS } from '@/lib/types'

export const maxDuration = 60

const client = new Anthropic()

// Build a concise field map to send to Claude
const fieldMap = PACKET_SECTIONS.map(s => ({
  section: s.key,
  label: s.label,
  fields: s.fields.map(f => ({ key: f.key, label: f.label, type: f.type })),
}))

export async function POST(req: NextRequest) {
  try {
    const { fileBase64, mediaType } = await req.json()

    if (!fileBase64) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const prompt = `You are extracting technical production information from a venue tech packet PDF.

Map the content to the following JSON structure. Return ONLY valid JSON — no markdown, no explanation.
Leave any field as an empty string "" if the information is not present in the document.
For textarea fields (gear lists), use newlines to separate multiple items.

Field structure:
${JSON.stringify(fieldMap, null, 2)}

Return a JSON object shaped like:
{
  "contacts": { "production_manager": "", "general_manager": "", ... },
  "stage": { "full_deck": "", ... },
  "audio": { "foh_console": "", ... },
  ...
}

Include all section keys even if empty. Match field keys exactly.`

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: mediaType ?? 'application/pdf',
                data: fileBase64,
              },
            },
            {
              type: 'text',
              text: prompt,
            },
          ],
        },
      ],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''

    // Strip any accidental markdown code fences
    const cleaned = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
    const parsed = JSON.parse(cleaned)

    return NextResponse.json({ fields: parsed })
  } catch (err) {
    console.error('PDF parse error:', err)
    return NextResponse.json({ error: 'Failed to parse PDF' }, { status: 500 })
  }
}
