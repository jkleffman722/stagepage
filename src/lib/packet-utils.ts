import { PACKET_SECTIONS } from './types'
import type { PacketSection } from './types'

export interface MissingRequiredField {
  sectionKey: string
  sectionLabel: string
  fieldKey: string
  fieldLabel: string
  /** "section_key.field_key" — used as a stable ID for requests */
  path: string
}

export interface PacketCompletion {
  totalFields: number
  filledFields: number
  requiredFields: number
  filledRequired: number
  missingRequired: MissingRequiredField[]
  pct: number
  requiredPct: number
  requiredComplete: boolean
}

export function getPacketCompletion(sections: PacketSection[]): PacketCompletion {
  const sectionMap = new Map(sections.map(s => [s.section_key, s]))

  let totalFields = 0
  let filledFields = 0
  let requiredFields = 0
  let filledRequired = 0
  const missingRequired: MissingRequiredField[] = []

  for (const sectionDef of PACKET_SECTIONS) {
    const section = sectionMap.get(sectionDef.key)
    for (const field of sectionDef.fields) {
      totalFields++
      const val = section?.fields?.[field.key]
      const isFilled = val !== null && val !== '' && val !== undefined
      if (isFilled) filledFields++
      if (field.required) {
        requiredFields++
        if (isFilled) {
          filledRequired++
        } else {
          missingRequired.push({
            sectionKey: sectionDef.key,
            sectionLabel: sectionDef.label,
            fieldKey: field.key,
            fieldLabel: field.label,
            path: `${sectionDef.key}.${field.key}`,
          })
        }
      }
    }
  }

  return {
    totalFields,
    filledFields,
    requiredFields,
    filledRequired,
    missingRequired,
    pct: Math.round((filledFields / totalFields) * 100),
    requiredPct: requiredFields > 0 ? Math.round((filledRequired / requiredFields) * 100) : 100,
    requiredComplete: missingRequired.length === 0,
  }
}
