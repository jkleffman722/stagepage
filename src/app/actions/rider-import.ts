'use server'

import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { TECH_RIDER_SECTIONS } from '@/lib/types'
import type { RiderSectionKey } from '@/lib/types'

export type ParsedRiderSections = Partial<Record<RiderSectionKey, Record<string, string | null>>>

export interface RiderPreviewField {
  key: string
  label: string
  value: string | null       // null = not found in document
  lowConfidence: boolean     // true = Haiku inferred rather than read directly
}

export interface RiderPreviewSection {
  key: RiderSectionKey
  label: string
  populatedCount: number
  blankCount: number
  lowConfidenceCount: number
  fields: RiderPreviewField[]
}

export async function parseRiderPDF(base64: string): Promise<{ text: string; error?: string }> {
  const client = new Anthropic()
  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4000,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data: base64 },
          } as unknown as Anthropic.TextBlockParam,
          {
            type: 'text',
            text: 'Extract all technical production information from this tech rider document. Return only the raw text — preserve all details about audio, lighting, power, stage requirements, labor, contacts, and hospitality. No formatting, no explanation.',
          },
        ],
      }],
    })
    const text = (response.content[0] as { type: string; text: string }).text.trim()
    return { text }
  } catch {
    return { text: '', error: 'Failed to extract text from PDF.' }
  }
}

interface RawParseResult {
  sections: ParsedRiderSections
  low_confidence: string[]  // dot-notation keys like "audio.foh_console"
}

export async function parseRiderDocument(text: string): Promise<{
  preview: RiderPreviewSection[]
  parsed: ParsedRiderSections
  lowConfidenceKeys: string[]
  error?: string
}> {
  const client = new Anthropic()

  const schemaRef = TECH_RIDER_SECTIONS.map(s => ({
    key: s.key,
    fields: s.fields.map(f => ({ key: f.key, label: f.label, type: f.type })),
  }))

  let rawResult: RawParseResult = { sections: {}, low_confidence: [] }

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 6000,
      system: 'You are a data extraction assistant for live music touring production. You output only valid JSON objects, never markdown, never explanations.',
      messages: [{
        role: 'user',
        content: `Parse this tech rider document and extract values into the structured field schema below.

Return ONLY a JSON object with exactly this structure:
{
  "sections": {
    "tour_info": { "tour_manager": null, ... },
    "audio": { "main_hang": null, ... },
    ...
  },
  "low_confidence": ["section_key.field_key", ...]
}

Rules for sections:
- null for any field not found in the document
- Boolean fields: use "true" or "false" as strings
- Number fields: use numeric string (e.g. "8")
- Include all section keys even if all fields are null

Rules for low_confidence:
- Add "section_key.field_key" for any field where you inferred the value rather than reading it directly
- Add it when the document is ambiguous, uses different terminology, or the value could plausibly be wrong
- Do NOT add it for values that are clearly and explicitly stated
- Examples of what to flag: a power value mentioned in a lighting context, a console name that partially matches, a crew count derived from a total

Field schema:
${JSON.stringify(schemaRef, null, 2)}

Tech rider document:
${text}`,
      }],
    })

    const raw = (response.content[0] as { type: string; text: string }).text.trim()
    const stripped = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
    const start = stripped.indexOf('{')
    const end = stripped.lastIndexOf('}')
    if (start === -1 || end === -1) {
      return { preview: [], parsed: {}, lowConfidenceKeys: [], error: 'Failed to parse document. Check that it contains tech rider content.' }
    }
    rawResult = JSON.parse(stripped.slice(start, end + 1)) as RawParseResult
  } catch (err) {
    console.error('parseRiderDocument error:', err)
    return { preview: [], parsed: {}, lowConfidenceKeys: [], error: 'Failed to parse document. Check that it contains tech rider content.' }
  }

  const parsed = rawResult.sections ?? {}
  const lowConfidenceSet = new Set(rawResult.low_confidence ?? [])

  // Build full preview — every field in every section, with status
  const preview: RiderPreviewSection[] = TECH_RIDER_SECTIONS.map(sectionDef => {
    const sectionData = parsed[sectionDef.key] ?? {}

    const fields: RiderPreviewField[] = sectionDef.fields.map(f => {
      const val = sectionData[f.key]
      const hasValue = val !== null && val !== undefined && val !== ''
      const isLowConfidence = lowConfidenceSet.has(`${sectionDef.key}.${f.key}`)
      return {
        key: f.key,
        label: f.label,
        value: hasValue ? String(val) : null,
        lowConfidence: isLowConfidence && hasValue,
      }
    })

    const populatedCount = fields.filter(f => f.value !== null).length
    const blankCount = fields.filter(f => f.value === null).length
    const lowConfidenceCount = fields.filter(f => f.lowConfidence).length

    return {
      key: sectionDef.key,
      label: sectionDef.label,
      populatedCount,
      blankCount,
      lowConfidenceCount,
      fields,
    }
  })

  return { preview, parsed, lowConfidenceKeys: rawResult.low_confidence ?? [] }
}

export async function applyRiderImport(
  riderId: string,
  parsed: ParsedRiderSections,
  lowConfidenceKeys: string[]
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  // Verify ownership via the rider → tour → profile chain
  const { data: rider } = await supabase
    .from('tech_riders')
    .select('id, tour_id, tours!inner(profile_id)')
    .eq('id', riderId)
    .single()

  if (!rider) return { success: false, error: 'Rider not found' }
  const tour = Array.isArray(rider.tours) ? rider.tours[0] : rider.tours
  if ((tour as { profile_id: string }).profile_id !== user.id) return { success: false, error: 'Not authorized' }

  // Fetch existing sections for upsert logic
  const { data: existingSections } = await supabase
    .from('tech_rider_sections')
    .select('id, section_key, fields, field_sources')
    .eq('rider_id', riderId)

  const existingMap = new Map((existingSections ?? []).map(s => [s.section_key, s]))
  const lowConfidenceSet = new Set(lowConfidenceKeys)
  const now = new Date().toISOString()

  for (const sectionDef of TECH_RIDER_SECTIONS) {
    const incomingFields = parsed[sectionDef.key]
    if (!incomingFields) continue

    const hasValues = Object.values(incomingFields).some(v => v !== null && v !== '')
    if (!hasValues) continue

    const existing = existingMap.get(sectionDef.key)
    const existingFieldSources: Record<string, unknown> = existing?.field_sources ?? {}

    const mergedFields: Record<string, string | number | boolean | null> = {}
    const mergedSources: Record<string, unknown> = { ...existingFieldSources }

    sectionDef.fields.forEach(f => {
      const existingVal = existing?.fields?.[f.key] ?? null
      const incomingVal = incomingFields[f.key]

      if (incomingVal !== null && incomingVal !== undefined && incomingVal !== '') {
        if (f.type === 'number') mergedFields[f.key] = Number(incomingVal)
        else if (f.type === 'boolean') mergedFields[f.key] = incomingVal === 'true'
        else mergedFields[f.key] = incomingVal

        // Only write source metadata if field was blank before (don't overwrite confirmed fields)
        if (existingVal === null || existingVal === '' || existingVal === undefined) {
          const dotKey = `${sectionDef.key}.${f.key}`
          mergedSources[f.key] = {
            type: 'imported',
            confidence: lowConfidenceSet.has(dotKey) ? 'low' : 'medium',
            importedAt: now,
          }
        }
      } else {
        mergedFields[f.key] = existingVal
      }
    })

    if (existing) {
      await supabase
        .from('tech_rider_sections')
        .update({ fields: mergedFields, field_sources: mergedSources, updated_at: now })
        .eq('id', existing.id)
    } else {
      await supabase
        .from('tech_rider_sections')
        .insert({
          rider_id: riderId,
          section_key: sectionDef.key,
          section_label: sectionDef.label,
          fields: mergedFields,
          field_sources: mergedSources,
          sort_order: TECH_RIDER_SECTIONS.findIndex(s => s.key === sectionDef.key),
        })
    }
  }

  await supabase
    .from('tech_riders')
    .update({ updated_at: now })
    .eq('id', riderId)

  return { success: true }
}
