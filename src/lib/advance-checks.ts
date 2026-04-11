import type { RiderSectionKey, SectionKey } from './types'

// ============================================================
// Advance Check — comparison points between tech rider and venue packet.
// Each item defines what the PM should verify before advancing the show.
// Status is derived from whether each side has a value.
// ============================================================

export interface AdvanceCheckItem {
  id: string
  category: string
  label: string
  note: string
  priority: 'critical' | 'important' | 'info'
  rider: { section: RiderSectionKey; field: string; label: string } | null
  venue: { section: SectionKey; field: string; label: string } | null
}

export const ADVANCE_CHECK_ITEMS: AdvanceCheckItem[] = [

  // ── Power ───────────────────────────────────────────────────────────────
  {
    id: 'power_lx',
    category: 'Power',
    label: 'LX / Rigging Power',
    note: 'Verify venue supply meets tour requirement. Note service type and distance to stage.',
    priority: 'critical',
    rider: { section: 'power', field: 'lx_rigging_power', label: 'Tour requires' },
    venue: { section: 'power', field: 'lighting_power', label: 'Venue provides' },
  },
  {
    id: 'power_audio',
    category: 'Power',
    label: 'Audio Power',
    note: 'Verify venue supply meets tour requirement.',
    priority: 'critical',
    rider: { section: 'power', field: 'audio_power', label: 'Tour requires' },
    venue: { section: 'power', field: 'audio_power', label: 'Venue provides' },
  },
  {
    id: 'power_service_type',
    category: 'Power',
    label: 'Service Type',
    note: 'Tour typically requires 3-phase. Confirm venue service type matches.',
    priority: 'critical',
    rider: { section: 'power', field: 'power_notes', label: 'Tour power notes' },
    venue: { section: 'power', field: 'service_type', label: 'Venue service type' },
  },
  {
    id: 'power_known_issues',
    category: 'Power',
    label: 'Known Power Issues',
    note: 'Flag any venue-reported limitations before load-in.',
    priority: 'important',
    rider: null,
    venue: { section: 'power', field: 'power_known_issues', label: 'Venue notes' },
  },

  // ── Audio ────────────────────────────────────────────────────────────────
  {
    id: 'audio_spl',
    category: 'Audio',
    label: 'SPL Limit',
    note: 'Surface for FOH engineer. Hard limits may affect mix decisions.',
    priority: 'critical',
    rider: null,
    venue: { section: 'audio', field: 'decibel_limit', label: 'Venue limit' },
  },
  {
    id: 'audio_console_removal',
    category: 'Audio',
    label: 'House Console Removal',
    note: 'If tour requires console removal, confirm venue can accommodate.',
    priority: 'critical',
    rider: { section: 'audio', field: 'house_consoles_removed', label: 'Tour requires removal' },
    venue: { section: 'audio', field: 'touring_console_tie_in', label: 'Venue allows tie-in' },
  },
  {
    id: 'audio_monitor_mixes',
    category: 'Audio',
    label: 'Monitor Mix Count',
    note: 'Confirm venue console supports the number of independent mixes the tour needs.',
    priority: 'important',
    rider: null,
    venue: { section: 'audio', field: 'monitor_mix_count', label: 'Venue monitor mixes' },
  },
  {
    id: 'audio_console_format',
    category: 'Audio',
    label: 'Console I/O Format',
    note: 'Tour console I/O must be compatible with venue tie-in (Dante, MADI, analog).',
    priority: 'important',
    rider: { section: 'audio', field: 'foh_console', label: 'Tour FOH console' },
    venue: { section: 'audio', field: 'console_io_format', label: 'Venue I/O format' },
  },

  // ── Lighting ─────────────────────────────────────────────────────────────
  {
    id: 'lighting_house_rig',
    category: 'Lighting',
    label: 'House Rig Strike',
    note: 'If tour requires house rig struck, confirm venue can do this and understand cost/time.',
    priority: 'important',
    rider: { section: 'lighting', field: 'house_rig_struck', label: 'Tour requires strike' },
    venue: { section: 'lighting', field: 'moving_lights', label: 'Venue house rig' },
  },
  {
    id: 'lighting_haze',
    category: 'Lighting',
    label: 'Haze / Atmosphere',
    note: 'Confirm haze is permitted. Note fire watch cost and any restrictions.',
    priority: 'important',
    rider: { section: 'lighting', field: 'haze_notes', label: 'Tour haze notes' },
    venue: { section: 'lighting', field: 'haze_fog', label: 'Venue haze policy' },
  },

  // ── Video / Streaming ────────────────────────────────────────────────────
  {
    id: 'video_internet',
    category: 'Video',
    label: 'Internet / Streaming',
    note: 'Verify venue internet meets tour streaming requirement. Get hardwired ethernet location.',
    priority: 'important',
    rider: { section: 'video', field: 'internet_requirement', label: 'Tour requires' },
    venue: { section: 'hospitality', field: 'wifi_notes', label: 'Venue internet' },
  },

  // ── Schedule ─────────────────────────────────────────────────────────────
  {
    id: 'schedule_curfew',
    category: 'Schedule',
    label: 'Hard Curfew',
    note: 'Non-negotiable curfew must be confirmed early. Affects set times and overtime costs.',
    priority: 'critical',
    rider: null,
    venue: { section: 'schedule', field: 'hard_curfew', label: 'Venue curfew' },
  },
  {
    id: 'schedule_crew_access',
    category: 'Schedule',
    label: 'Earliest Crew Access',
    note: 'Confirm crew can access the building at the time needed for load-in.',
    priority: 'critical',
    rider: null,
    venue: { section: 'schedule', field: 'crew_access', label: 'Venue earliest access' },
  },
  {
    id: 'schedule_load_in',
    category: 'Schedule',
    label: 'Load-In Window',
    note: 'Verify load-in window is sufficient for the production size.',
    priority: 'important',
    rider: null,
    venue: { section: 'schedule', field: 'load_in_window', label: 'Venue load-in window' },
  },

  // ── Labor / Crew ─────────────────────────────────────────────────────────
  {
    id: 'crew_union',
    category: 'Labor',
    label: 'Union Affiliation',
    note: 'IATSE rules affect call times, meal breaks, and overtime. Know this before building the labor call.',
    priority: 'critical',
    rider: null,
    venue: { section: 'crew', field: 'union_affiliation', label: 'Venue union' },
  },
  {
    id: 'crew_mandatory',
    category: 'Labor',
    label: 'Mandatory House Crew',
    note: 'If venue requires mandatory crew, factor into labor budget.',
    priority: 'important',
    rider: null,
    venue: { section: 'crew', field: 'mandatory_crew', label: 'Mandatory crew required' },
  },
  {
    id: 'crew_min_stagehands',
    category: 'Labor',
    label: 'Min Stagehand Count',
    note: 'Venue minimum may be lower or higher than tour defaults. Affects 1st call planning.',
    priority: 'important',
    rider: { section: 'labor_defaults', field: 'first_call_total', label: 'Tour 1st call total' },
    venue: { section: 'crew', field: 'min_stagehands', label: 'Venue minimum' },
  },

  // ── Load-In ──────────────────────────────────────────────────────────────
  {
    id: 'load_in_dock_height',
    category: 'Load-In',
    label: 'Dock Height',
    note: 'Confirm semi trucks can dock. Unusually low or high docks require ramps or lift gates.',
    priority: 'important',
    rider: null,
    venue: { section: 'load_in', field: 'dock_height', label: 'Venue dock height' },
  },
  {
    id: 'load_in_dock_door',
    category: 'Load-In',
    label: 'Dock Door Dimensions',
    note: 'Confirm largest case or piece clears the door before load-in day.',
    priority: 'important',
    rider: null,
    venue: { section: 'load_in', field: 'dock_door_dimensions', label: 'Venue door size' },
  },
  {
    id: 'load_in_forklift',
    category: 'Load-In',
    label: 'Forklift',
    note: 'Confirm forklift is available and weight-rated for tour needs.',
    priority: 'important',
    rider: { section: 'labor_defaults', field: 'forklift', label: 'Tour requires' },
    venue: { section: 'load_in', field: 'forklift', label: 'Venue has forklift' },
  },

  // ── Production ───────────────────────────────────────────────────────────
  {
    id: 'production_stage_dims',
    category: 'Production',
    label: 'Stage Dimensions',
    note: 'Confirm stage is wide/deep enough for the production.',
    priority: 'critical',
    rider: { section: 'stage_requirements', field: 'stage_notes', label: 'Tour notes' },
    venue: { section: 'stage', field: 'full_deck', label: 'Venue stage dims' },
  },
  {
    id: 'production_rigging',
    category: 'Production',
    label: 'Rigging Capacity',
    note: 'Confirm trim height and point load capacity support tour rig weight.',
    priority: 'critical',
    rider: null,
    venue: { section: 'stage', field: 'rigging_points', label: 'Venue rigging points' },
  },
  {
    id: 'production_trim_height',
    category: 'Production',
    label: 'Trim Height',
    note: 'Confirm grid height is sufficient for tour rig.',
    priority: 'critical',
    rider: null,
    venue: { section: 'stage', field: 'trim_height', label: 'Venue trim height' },
  },
]

export const ADVANCE_CHECK_CATEGORIES = [
  'Power',
  'Audio',
  'Lighting',
  'Video',
  'Schedule',
  'Labor',
  'Load-In',
  'Production',
] as const
