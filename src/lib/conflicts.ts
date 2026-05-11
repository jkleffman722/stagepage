// Conflict detection engine — compares tour tech rider requirements against venue packet capabilities.
// Each rule produces a Conflict if a mismatch or missing value is detected.

export type ConflictSeverity = 'critical' | 'warning' | 'missing'

export interface Conflict {
  id: string            // stable identifier for this rule
  severity: ConflictSeverity
  category: string      // display grouping: 'Stage', 'Power', 'Audio', etc.
  label: string         // short field name
  riderField: string    // 'section.field_key' — empty string if not rider-driven
  packetField: string   // 'section.field_key'
  riderValue: string    // what the rider requires (human-readable)
  venueValue: string    // what the venue has, or '' if missing
  message: string       // plain-English explanation for the PM / agent
}

type FieldMap = Map<string, Record<string, unknown>>

// ── Helpers ──────────────────────────────────────────────────────────────────

function get(map: FieldMap, section: string, field: string): string {
  const v = map.get(section)?.[field]
  if (v == null || v === '') return ''
  if (typeof v === 'boolean') return v ? 'Yes' : 'No'
  return String(v).trim()
}

// Parse feet from "60'", "60 ft", "60′", "60 feet", "60"
function parseFeet(s: string): number | null {
  if (!s) return null
  const m = s.match(/(\d+(?:\.\d+)?)\s*(?:′|'|ft|feet)?/)
  return m ? parseFloat(m[1]) : null
}

// Parse stage width from "60' W × 40' D × 8' H", "60×40", "60 x 40 x 8", etc.
function parseStageWidth(s: string): number | null {
  if (!s) return null
  // Explicit W label
  const wLabel = s.match(/(\d+(?:\.\d+)?)\s*(?:′|'|ft|feet)?\s*(?:W\b|wide)/i)
  if (wLabel) return parseFloat(wLabel[1])
  // First number in a dimension string
  const first = s.match(/(\d+)/)
  return first ? parseInt(first[1]) : null
}

// Parse stage depth from dimension strings
function parseStageDepth(s: string): number | null {
  if (!s) return null
  // Explicit D label
  const dLabel = s.match(/(\d+(?:\.\d+)?)\s*(?:′|'|ft|feet)?\s*(?:D\b|deep)/i)
  if (dLabel) return parseFloat(dLabel[1])
  // Second number in a dimension string (W × D × H)
  const nums = s.match(/\d+/g)
  return nums && nums.length >= 2 ? parseInt(nums[1]) : null
}

function lower(s: string) { return s.toLowerCase() }

// Returns true if any power field in the packet indicates 3-phase service.
// Covers written forms ("3 phase", "three phase"), the phase symbol variants
// (Ø U+00D8, ø U+00F8, φ U+03C6), and shorthand ("3P").
function hasThreePhaseEvidence(packet: FieldMap): boolean {
  const candidates = [
    get(packet, 'power', 'service_type'),
    get(packet, 'power', 'total_service'),
    get(packet, 'power', 'available_to_production'),
    get(packet, 'power', 'lighting_power'),
    get(packet, 'power', 'audio_power'),
    get(packet, 'power', 'power_notes'),
  ]
  return candidates.some(v => {
    const l = lower(v)
    return (
      /3[\s-]?phase/i.test(v) ||
      /three[\s-]?phase/i.test(v) ||
      /3\s*[øØøφΦ]/i.test(v) ||   // "3 Ø", "3Ø", "3φ" etc.
      /\bwye\b/i.test(v) ||
      /\bdelta\b/i.test(v) ||
      l.includes('3p ') || l.includes('3p,') || l.includes('3p;')
    )
  })
}

function containsNegative(s: string): boolean {
  const l = lower(s)
  return l.includes('no ') || l.startsWith('no') || l.includes('not available') ||
    l.includes('not possible') || l.includes('not permitted') ||
    l.includes('not allowed') || l.includes('prohibited') || l.includes('n/a')
}

// ── Rule engine ───────────────────────────────────────────────────────────────

export function computeConflicts(rider: FieldMap, packet: FieldMap): Conflict[] {
  const conflicts: Conflict[] = []
  const add = (c: Conflict) => conflicts.push(c)

  // ── 1. Stage Width ──────────────────────────────────────────────────────
  const minWidth = get(rider, 'stage_requirements', 'min_stage_width')
  const fullDeck = get(packet, 'stage', 'full_deck')
  if (minWidth) {
    const required = parseFeet(minWidth)
    const available = parseStageWidth(fullDeck)
    if (required !== null) {
      if (!fullDeck || available === null) {
        add({ id: 'stage_width_missing', severity: 'missing', category: 'Stage', label: 'Stage Width', riderField: 'stage_requirements.min_stage_width', packetField: 'stage.full_deck', riderValue: minWidth, venueValue: fullDeck, message: `Rider requires ${minWidth} minimum stage width. Venue has not provided stage dimensions.` })
      } else if (available < required) {
        add({ id: 'stage_width', severity: 'critical', category: 'Stage', label: 'Stage Width', riderField: 'stage_requirements.min_stage_width', packetField: 'stage.full_deck', riderValue: minWidth, venueValue: fullDeck, message: `Rider requires ${required}ft minimum stage width. Venue stage is ${available}ft wide — ${required - available}ft short.` })
      }
    }
  }

  // ── 2. Stage Depth ──────────────────────────────────────────────────────
  const minDepth = get(rider, 'stage_requirements', 'min_stage_depth')
  if (minDepth) {
    const required = parseFeet(minDepth)
    const available = parseStageDepth(fullDeck)
    if (required !== null) {
      if (!fullDeck || available === null) {
        add({ id: 'stage_depth_missing', severity: 'missing', category: 'Stage', label: 'Stage Depth', riderField: 'stage_requirements.min_stage_depth', packetField: 'stage.full_deck', riderValue: minDepth, venueValue: fullDeck, message: `Rider requires ${minDepth} minimum stage depth. Venue has not provided stage dimensions.` })
      } else if (available < required) {
        add({ id: 'stage_depth', severity: 'critical', category: 'Stage', label: 'Stage Depth', riderField: 'stage_requirements.min_stage_depth', packetField: 'stage.full_deck', riderValue: minDepth, venueValue: fullDeck, message: `Rider requires ${required}ft minimum stage depth. Venue stage is ${available}ft deep — ${required - available}ft short.` })
      }
    }
  }

  // ── 3. Power Service Type ───────────────────────────────────────────────
  const requiredService = get(rider, 'power', 'required_service_type')
  const venueService = get(packet, 'power', 'service_type')
  if (requiredService === 'Three-phase') {
    const venueConfirmsThreePhase = hasThreePhaseEvidence(packet)
    if (!venueConfirmsThreePhase) {
      if (!venueService) {
        add({ id: 'power_service_missing', severity: 'missing', category: 'Power', label: 'Power Service Type', riderField: 'power.required_service_type', packetField: 'power.service_type', riderValue: '3-phase required', venueValue: '', message: 'Rider requires 3-phase power. Venue has not confirmed service type.' })
      } else {
        add({ id: 'power_service', severity: 'critical', category: 'Power', label: 'Power Service Type', riderField: 'power.required_service_type', packetField: 'power.service_type', riderValue: '3-phase required', venueValue: venueService, message: `Rider requires 3-phase power. Venue lists "${venueService}" — confirm before advancing.` })
      }
    }
  }

  // ── 4. Hard Curfew ──────────────────────────────────────────────────────
  // Always flag if missing — required for every show regardless of rider
  const hardCurfew = get(packet, 'schedule', 'hard_curfew')
  if (!hardCurfew) {
    add({ id: 'curfew_missing', severity: 'missing', category: 'Schedule', label: 'Hard Curfew', riderField: '', packetField: 'schedule.hard_curfew', riderValue: '', venueValue: '', message: 'Venue has not confirmed hard curfew. Required before finalizing show schedule.' })
  }

  // ── 5. Haze / Atmosphere ────────────────────────────────────────────────
  const hazeAllowed = get(rider, 'lighting', 'haze_allowed')
  const venueHaze = get(packet, 'lighting', 'haze_fog')
  if (hazeAllowed === 'Yes') {
    if (!venueHaze) {
      add({ id: 'haze_missing', severity: 'missing', category: 'Lighting', label: 'Haze Policy', riderField: 'lighting.haze_allowed', packetField: 'lighting.haze_fog', riderValue: 'Haze required', venueValue: '', message: 'Rider requires haze / atmosphere. Venue has not confirmed their haze policy.' })
    } else if (containsNegative(venueHaze) || lower(venueHaze).includes('no haze')) {
      add({ id: 'haze_denied', severity: 'warning', category: 'Lighting', label: 'Haze Policy', riderField: 'lighting.haze_allowed', packetField: 'lighting.haze_fog', riderValue: 'Haze required', venueValue: venueHaze, message: `Rider requires haze. Venue policy: "${venueHaze}" — confirm whether exceptions are possible.` })
    }
  }

  // ── 6. Console Tie-In ───────────────────────────────────────────────────
  const venueAudioReqs = get(rider, 'audio', 'venue_audio_requirements')
  const tieIn = get(packet, 'audio', 'touring_console_tie_in')
  if (venueAudioReqs) {
    if (!tieIn) {
      add({ id: 'console_tiein_missing', severity: 'missing', category: 'Audio', label: 'Console Tie-In', riderField: 'audio.venue_audio_requirements', packetField: 'audio.touring_console_tie_in', riderValue: venueAudioReqs, venueValue: '', message: 'Rider specifies venue audio requirements. Venue has not confirmed touring console tie-in availability.' })
    } else if (containsNegative(tieIn)) {
      add({ id: 'console_tiein_denied', severity: 'warning', category: 'Audio', label: 'Console Tie-In', riderField: 'audio.venue_audio_requirements', packetField: 'audio.touring_console_tie_in', riderValue: venueAudioReqs, venueValue: tieIn, message: `Rider requires console tie-in. Venue states: "${tieIn}".` })
    }
  }

  // ── 7. House Consoles Must Be Removed ───────────────────────────────────
  const consolesRemoved = get(rider, 'audio', 'house_consoles_removed')
  const venueFohConsole = get(packet, 'audio', 'foh_console')
  if (consolesRemoved === 'Yes' && venueFohConsole) {
    add({ id: 'consoles_removal', severity: 'warning', category: 'Audio', label: 'House Console Removal', riderField: 'audio.house_consoles_removed', packetField: 'audio.foh_console', riderValue: 'House consoles must be removed', venueValue: venueFohConsole, message: `Rider requires house consoles to be removed. Venue has a ${venueFohConsole} — confirm removal is possible and whether a fee applies.` })
  }

  // ── 8. Forklift ─────────────────────────────────────────────────────────
  const forkNeeded = get(rider, 'labor_defaults', 'forklift')
  const forkAvailable = get(packet, 'load_in', 'forklift')
  if (forkNeeded && parseInt(forkNeeded) > 0) {
    if (!forkAvailable) {
      add({ id: 'forklift_missing', severity: 'missing', category: 'Load-In', label: 'Forklift', riderField: 'labor_defaults.forklift', packetField: 'load_in.forklift', riderValue: `${forkNeeded} forklift(s) needed`, venueValue: '', message: `Rider requires ${forkNeeded} forklift(s). Venue has not confirmed forklift availability.` })
    } else if (containsNegative(forkAvailable)) {
      add({ id: 'forklift_unavailable', severity: 'warning', category: 'Load-In', label: 'Forklift', riderField: 'labor_defaults.forklift', packetField: 'load_in.forklift', riderValue: `${forkNeeded} forklift(s) needed`, venueValue: forkAvailable, message: `Rider requires a forklift. Venue states: "${forkAvailable}" — arrange rental in advance.` })
    }
  }

  // ── 9. Shore Power ──────────────────────────────────────────────────────
  const busCount = get(rider, 'tour_info', 'bus_count')
  const shorePower = get(packet, 'load_in', 'shore_power_parking')
  if (busCount && parseInt(busCount) > 0) {
    if (!shorePower) {
      add({ id: 'shore_power_missing', severity: 'missing', category: 'Load-In', label: 'Shore Power', riderField: 'tour_info.bus_count', packetField: 'load_in.shore_power_parking', riderValue: `${busCount} bus(es) on tour`, venueValue: '', message: `Tour has ${busCount} bus(es). Venue has not confirmed shore power availability — buses may need to idle overnight.` })
    } else if (containsNegative(shorePower)) {
      add({ id: 'shore_power_unavailable', severity: 'warning', category: 'Load-In', label: 'Shore Power', riderField: 'tour_info.bus_count', packetField: 'load_in.shore_power_parking', riderValue: `${busCount} bus(es) on tour`, venueValue: shorePower, message: `Shore power unavailable at this venue. ${busCount} bus(es) will need to idle — factor generator/idle costs into budget.` })
    }
  }

  // ── 10. Upstage Black ───────────────────────────────────────────────────
  const upstageBlack = get(rider, 'stage_requirements', 'upstage_black')
  const stageNotes = get(packet, 'stage', 'stage_notes')
  if (upstageBlack === 'Yes' && stageNotes) {
    // Warn if notes suggest a fixed scenic background (common at outdoor venues like Red Rocks)
    const l = lower(stageNotes)
    if (l.includes('rock') || l.includes('scenic') || l.includes('fixed') || l.includes('permanent')) {
      add({ id: 'upstage_black', severity: 'warning', category: 'Stage', label: 'Upstage Black', riderField: 'stage_requirements.upstage_black', packetField: 'stage.stage_notes', riderValue: 'Upstage black required', venueValue: stageNotes, message: `Rider requires upstage black legs. Venue stage notes suggest a fixed scenic background — confirm whether blacks can be rigged.` })
    }
  }

  return conflicts
}

// ── Utility ───────────────────────────────────────────────────────────────────

export const SEVERITY_ORDER: Record<ConflictSeverity, number> = {
  critical: 0,
  warning: 1,
  missing: 2,
}

export function sortConflicts(conflicts: Conflict[]): Conflict[] {
  return [...conflicts].sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])
}

export const SEVERITY_LABEL: Record<ConflictSeverity, string> = {
  critical: 'Critical',
  warning: 'Warning',
  missing: 'Missing',
}

export const SEVERITY_COLOR: Record<ConflictSeverity, { bg: string; text: string; border: string }> = {
  critical: { bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200'   },
  warning:  { bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200' },
  missing:  { bg: 'bg-zinc-50',   text: 'text-zinc-500',   border: 'border-zinc-200'  },
}
