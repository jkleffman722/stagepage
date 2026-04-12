export type UserRole = 'venue' | 'artist'

export interface Profile {
  id: string
  role: UserRole
  display_name: string | null
  organization: string | null
  job_role: string | null
  created_at: string
  updated_at: string
}

export interface Tour {
  id: string
  profile_id: string
  artist_name: string
  tour_name: string
  user_role: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Show {
  id: string
  tour_id: string
  event_date: string
  venue_id: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export const ARTIST_ROLES = [
  'Tour Manager',
  'Production Manager',
  'Lighting Director',
  'Sound Engineer',
  'Stage Manager',
] as const

export interface Venue {
  id: string
  owner_id: string
  name: string
  address: string | null
  city: string | null
  state: string | null
  capacity: number | null
  website: string | null
  contact_email: string | null
  contact_phone: string | null
  created_at: string
  updated_at: string
}

export interface TechnicalPacket {
  id: string
  venue_id: string
  is_published: boolean
  last_updated_at: string
  created_at: string
}

// Each section has a key, label, and a flexible fields object.
// Fields are defined per section in PACKET_SECTIONS below.
export interface FieldSource {
  type: 'pdf' | 'manual'
  attachmentId?: string
  fileName?: string
}

export interface PacketSection {
  id: string
  packet_id: string
  section_key: SectionKey
  section_label: string
  fields: Record<string, string | number | boolean | null>
  field_sources: Record<string, FieldSource>
  sort_order: number
  updated_at: string
}

export interface PacketAttachment {
  id: string
  packet_id: string
  file_name: string
  storage_path: string
  file_type: string | null
  uploaded_at: string
}

export interface ShareRequest {
  id: string
  venue_id: string
  requester_profile_id: string | null
  requester_name: string | null
  requester_email: string
  event_date: string | null
  message: string | null
  status: 'pending' | 'approved' | 'denied' | 'revoked'
  access_token: string
  created_at: string
  updated_at: string
}

// ============================================================
// Packet section definitions — based on real production tech packets
// (FL Groves festival + The Midland Theatre)
// Gear list fields use textarea so venues can enter multiple items.
// ============================================================

export type SectionKey =
  | 'contacts'
  | 'schedule'
  | 'stage'
  | 'audio'
  | 'lighting'
  | 'video'
  | 'power'
  | 'backline'
  | 'load_in'
  | 'crew'
  | 'hospitality'

export interface FieldDefinition {
  key: string
  label: string
  type: 'text' | 'number' | 'select' | 'textarea' | 'boolean'
  options?: string[]
  placeholder?: string
  defaultValue?: string | number | boolean
}

export interface SectionDefinition {
  key: SectionKey
  label: string
  fields: FieldDefinition[]
}

// ============================================================
// Tech Rider — tour-side document, one per tour
// Captures what the touring production carries and requires.
// Fields map directly to advance sheet auto-population.
// ============================================================

export interface TechRider {
  id: string
  tour_id: string
  created_at: string
  updated_at: string
}

export interface TechRiderSection {
  id: string
  rider_id: string
  section_key: RiderSectionKey
  section_label: string
  fields: Record<string, string | number | boolean | null>
  sort_order: number
  updated_at: string
}

// ============================================================
// Input List
// ============================================================

export interface ShowAdvance {
  id: string
  show_id: string
  fields: Record<string, string | null>
  created_at: string
  updated_at: string
}

export const INPUT_TYPES = [
  'Dynamic mic',
  'Condenser mic',
  'Ribbon mic',
  'Active DI',
  'Passive DI',
  'Wireless (dynamic)',
  'Wireless (condenser)',
  'Other',
] as const

export type InputType = typeof INPUT_TYPES[number]

export interface InputList {
  id: string
  tour_id: string
  created_at: string
  updated_at: string
}

export interface InputListChannel {
  id: string
  list_id: string
  channel_number: number | null
  source_name: string | null
  input_type: string | null
  mic_model: string | null
  phantom_power: boolean | null
  stage_location: string | null
  monitor_mixes: string | null
  notes: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

export type RiderSectionKey =
  | 'tour_info'
  | 'audio'
  | 'lighting'
  | 'video'
  | 'power'
  | 'stage_requirements'
  | 'labor_defaults'
  | 'hospitality'
  | 'production_notes'

export interface RiderSectionDefinition {
  key: RiderSectionKey
  label: string
  fields: FieldDefinition[]
}

export const TECH_RIDER_SECTIONS: RiderSectionDefinition[] = [
  {
    key: 'tour_info',
    label: 'Tour Contacts & Logistics',
    fields: [
      { key: 'tour_manager', label: 'Tour Manager', type: 'text', placeholder: 'Name · phone · email' },
      { key: 'production_manager', label: 'Production Manager', type: 'text', placeholder: 'Name · phone · email' },
      { key: 'production_assistant', label: 'Production Assistant', type: 'text', placeholder: 'Name · phone · email' },
      { key: 'merch', label: 'Tour Merch', type: 'text', placeholder: 'Name · phone · email' },
      { key: 'lead_driver', label: 'Lead Driver', type: 'text', placeholder: 'Name · phone' },
      { key: 'bus_count', label: 'Number of Buses', type: 'text', placeholder: 'e.g. 3 Buses' },
      { key: 'truck_count', label: 'Number of Trucks', type: 'text', placeholder: 'e.g. 4 Semi / 1 Box' },
    ],
  },
  {
    key: 'audio',
    label: 'Audio System',
    fields: [
      { key: 'main_hang', label: 'Main Hang (tour carries)', type: 'text', placeholder: 'e.g. Cohesion CO10' },
      { key: 'sub', label: 'Sub (tour carries)', type: 'text', placeholder: 'e.g. Cohesion CP218' },
      { key: 'side_front_fills', label: 'Side / Front Fills', type: 'text', placeholder: 'e.g. Cohesion CP6' },
      { key: 'foh_console', label: 'FOH Console (tour carries)', type: 'text', placeholder: 'e.g. DiGiCo SD12' },
      { key: 'monitor_console', label: 'Monitor Console (tour carries)', type: 'text', placeholder: 'e.g. DiGiCo SD9' },
      { key: 'required_channel_count', label: 'Total Input Channels', type: 'number', placeholder: 'Auto-populated from input list' },
      { key: 'required_monitor_mixes', label: 'Monitor Mixes Required', type: 'number', placeholder: 'Auto-populated from input list' },
      { key: 'venue_audio_requirements', label: 'Venue Must Provide', type: 'textarea', placeholder: 'What the venue needs to provide or prepare (tie-in connection, console removal, etc.)' },
      { key: 'house_consoles_removed', label: 'House Consoles Must Be Removed?', type: 'boolean' },
      { key: 'audio_notes', label: 'Notes', type: 'textarea' },
    ],
  },
  {
    key: 'lighting',
    label: 'Lighting Requirements',
    fields: [
      { key: 'house_rig_struck', label: 'House Rig Must Be Struck?', type: 'boolean' },
      { key: 'haze_allowed', label: 'Haze / Atmosphere Allowed?', type: 'boolean' },
      { key: 'haze_notes', label: 'Haze Notes', type: 'text', placeholder: 'e.g. Fire watch required — $105/hr; must notify venue 2 weeks out' },
      { key: 'co2_request', label: 'CO₂ Request', type: 'text', placeholder: 'e.g. 6 tanks 20lb non-syphon' },
      { key: 'tour_ld', label: 'Tour LD', type: 'text', placeholder: 'Name' },
      { key: 'lighting_notes', label: 'Notes', type: 'textarea' },
    ],
  },
  {
    key: 'video',
    label: 'Video & Streaming',
    fields: [
      { key: 'streaming_platform', label: 'Streaming Platform', type: 'text', placeholder: 'e.g. Nugs' },
      { key: 'internet_requirement', label: 'Internet Requirement', type: 'text', placeholder: 'e.g. 1 Gbps up, dedicated line' },
      { key: 'imag_requirements', label: 'IMAG Requirements', type: 'textarea', placeholder: 'What the venue IMAG system needs to support (tie-in location, signal format, etc.)' },
      { key: 'video_notes', label: 'Notes', type: 'textarea' },
    ],
  },
  {
    key: 'power',
    label: 'Power Requirements',
    fields: [
      { key: 'required_service_type', label: 'Required Service Type', type: 'select', options: ['Single-phase', 'Three-phase'], defaultValue: 'Three-phase' },
      { key: 'lx_rigging_power', label: 'Rigging / LX Power Needed', type: 'text', placeholder: 'e.g. (3) 400A + (1) 200A 3-phase' },
      { key: 'lx_rigging_location', label: 'Rigging / LX Power Location', type: 'text', placeholder: 'e.g. USR' },
      { key: 'audio_power', label: 'Audio Power Needed', type: 'text', placeholder: 'e.g. (2) 200A 3-phase' },
      { key: 'audio_location', label: 'Audio Power Location', type: 'text', placeholder: 'e.g. USL / USR' },
      { key: 'video_power', label: 'Video Power Needed', type: 'text', placeholder: 'e.g. (1) 100A 3-phase' },
      { key: 'video_location', label: 'Video Power Location', type: 'text', placeholder: 'e.g. Audio distro' },
      { key: 'extra_feeder', label: 'Extra Feeder Requirements', type: 'textarea', placeholder: 'Any additional power needs' },
      { key: 'power_notes', label: 'Notes', type: 'textarea', defaultValue: 'All 3-phase 240V within 100′ of location. Cable runs in public areas to be matted.' },
    ],
  },
  {
    key: 'stage_requirements',
    label: 'Stage & Production Requirements',
    fields: [
      { key: 'min_stage_width', label: 'Minimum Stage Width Required', type: 'text', placeholder: "e.g. 60′" },
      { key: 'min_stage_depth', label: 'Minimum Stage Depth Required', type: 'text', placeholder: "e.g. 30′" },
      { key: 'risers_needed', label: 'Risers Needed', type: 'textarea', placeholder: 'e.g. (1) 8′×8′ @ 16″' },
      { key: 'barricade_distance', label: 'Barricade: Distance from DSE', type: 'text', placeholder: "e.g. 8′ from downstage edge" },
      { key: 'barricade_type', label: 'Barricade Type Preferred', type: 'text', placeholder: 'e.g. Mojo or equivalent' },
      { key: 'production_in_pit', label: 'Production in Pit', type: 'text', placeholder: 'e.g. Cam op with shoulder camera' },
      { key: 'upstage_black', label: 'Upstage Black / Legs Required?', type: 'boolean' },
      { key: 'dead_storage_needs', label: 'Dead Storage Needs', type: 'textarea', placeholder: 'Required staging area for empty cases' },
      { key: 'stage_notes', label: 'Notes', type: 'textarea' },
    ],
  },
  {
    key: 'labor_defaults',
    label: 'Labor Defaults',
    fields: [
      { key: 'crew_chief', label: 'Crew Chief (Load In · Show · Load Out)', type: 'text', placeholder: 'e.g. 1 · 1 · 1' },
      { key: 'electrician', label: 'Electrician (Load In · Show · Load Out)', type: 'text', placeholder: 'e.g. 1 · 1 · 1' },
      { key: 'head_rigger', label: 'Head Rigger (Load In · Show · Load Out)', type: 'text', placeholder: 'e.g. 1 · 1 · 1' },
      { key: 'up_riggers', label: 'Up Riggers (Load In count)', type: 'number', placeholder: 'e.g. 8' },
      { key: 'down_riggers', label: 'Down Riggers (Load Out count)', type: 'number', placeholder: 'e.g. 4' },
      { key: 'loaders', label: 'Loaders', type: 'number', placeholder: 'e.g. 4' },
      { key: 'forklift', label: 'Forklift', type: 'number', placeholder: 'e.g. 1' },
      { key: 'first_call_total', label: '1st Call — Total', type: 'number', placeholder: 'e.g. 14' },
      { key: 'first_call_breakdown', label: '1st Call — Dept Breakdown', type: 'text', placeholder: 'e.g. 8 LX · 6 Audio' },
      { key: 'second_call_breakdown', label: '2nd Call — Dept Breakdown', type: 'text', placeholder: 'e.g. 4 Audio · 2 Backline · 2 Video' },
      { key: 'load_out_total', label: 'Load Out — Total', type: 'number', placeholder: 'e.g. 22' },
      { key: 'load_out_breakdown', label: 'Load Out — Dept Breakdown', type: 'text', placeholder: 'e.g. 8 LX · 6 Audio · 4 Backline · 4 Video' },
      { key: 'labor_min_call', label: 'Labor Min Call', type: 'text', placeholder: 'e.g. 4hr min, 1.5× after midnight', defaultValue: '4hr min, 1.5× after midnight' },
      { key: 'feeding_rules', label: 'Feeding Rules', type: 'text', placeholder: 'e.g. Feed after 5 hours worked', defaultValue: 'Feed after 5 hours worked' },
      { key: 'labor_notes', label: 'Notes', type: 'textarea' },
    ],
  },
  {
    key: 'hospitality',
    label: 'Hospitality Requirements',
    fields: [
      { key: 'bath_towels', label: 'Bath Towels Needed', type: 'number', placeholder: 'e.g. 50' },
      { key: 'stage_towels', label: 'Stage Towels Needed', type: 'number', placeholder: 'e.g. 10' },
      { key: 'tabling_needs', label: 'Tabling Needs', type: 'text', placeholder: "e.g. (3) 6′ tables with (2) chairs each in lobby" },
      { key: 'aftershow_cash', label: 'After-Show Food Cash', type: 'text', placeholder: 'e.g. $400' },
      { key: 'catering_rider', label: 'Catering Rider Link / Notes', type: 'textarea', placeholder: 'Link to catering rider document or key requirements' },
      { key: 'hospitality_notes', label: 'Notes', type: 'textarea' },
    ],
  },
  {
    key: 'production_notes',
    label: 'General Production Notes',
    fields: [
      { key: 'notes', label: 'Notes', type: 'textarea', placeholder: 'General requirements, standards, or anything else the venue needs to know before advancing this show.' },
      { key: 'standard_note', label: 'Standard Advance Note', type: 'textarea', defaultValue: 'With this document should be the tour stage plot, rigging plot and general rider. If you have not received this, please reach out to Production Manager.' },
    ],
  },
]

export const PACKET_SECTIONS: SectionDefinition[] = [
  {
    key: 'contacts',
    label: 'Contacts',
    fields: [
      { key: 'production_manager', label: 'Production Manager', type: 'text', placeholder: 'Name · email · phone' },
      { key: 'general_manager', label: 'General Manager', type: 'text', placeholder: 'Name · email' },
      { key: 'advance_contact', label: 'Advance Contact', type: 'text', placeholder: 'Name · email' },
      { key: 'house_sound_engineer', label: 'House Sound Engineer', type: 'text', placeholder: 'Name · email · phone' },
      { key: 'house_ld', label: 'House Lighting Designer', type: 'text', placeholder: 'Name · email · phone' },
      { key: 'head_rigger', label: 'Head Rigger', type: 'text', placeholder: 'Name · email · phone' },
      { key: 'stage_manager', label: 'Stage Manager / Head Carpenter', type: 'text', placeholder: 'Name · email · phone' },
      { key: 'emergency_contact', label: 'Emergency / After-Hours Contact', type: 'text', placeholder: 'Name · phone (available during load-in and show)' },
      { key: 'vip_merch_contact', label: 'VIP / Merch Contact', type: 'text', placeholder: 'Name · email' },
      { key: 'box_office', label: 'Box Office', type: 'text', placeholder: 'Name · email · hours' },
      { key: 'additional_contacts', label: 'Additional Contacts', type: 'textarea', placeholder: 'Any other key contacts and roles...' },
    ],
  },
  {
    key: 'schedule',
    label: 'Show Schedule',
    fields: [
      { key: 'crew_access', label: 'Earliest Crew Access', type: 'text', placeholder: 'e.g. 8:00 AM' },
      { key: 'load_in_window', label: 'Load-In Window', type: 'text', placeholder: 'e.g. 9:00 AM – 3:00 PM' },
      { key: 'soundcheck_window', label: 'Soundcheck Window', type: 'text', placeholder: 'e.g. 3:00 PM – 6:00 PM' },
      { key: 'doors_open', label: 'Doors Open to Audience', type: 'text', placeholder: 'e.g. 7:00 PM' },
      { key: 'show_start', label: 'Show Start Time', type: 'text', placeholder: 'e.g. 8:00 PM' },
      { key: 'hard_curfew', label: 'Hard Curfew', type: 'text', placeholder: 'e.g. 11:00 PM — non-negotiable' },
      { key: 'load_out_window', label: 'Load-Out / Strike Window', type: 'text', placeholder: 'e.g. 11:00 PM – 2:00 AM' },
      { key: 'clear_by', label: 'Venue Must Be Clear By', type: 'text', placeholder: 'e.g. 2:00 AM' },
      { key: 'schedule_notes', label: 'Notes', type: 'textarea', placeholder: 'Noise ordinances, city curfews, overtime fees, etc.' },
    ],
  },
  {
    key: 'stage',
    label: 'Stage',
    fields: [
      { key: 'full_deck', label: 'Full Deck (W × D × H)', type: 'text', placeholder: "e.g. 86′ × 34′ × 3′5″" },
      { key: 'performance_area', label: 'Performance Area (W × D)', type: 'text', placeholder: "e.g. 47′10″ × 28′" },
      { key: 'stage_height', label: 'Stage Height Above Audience Floor', type: 'text', placeholder: "e.g. 4′" },
      { key: 'surface_type', label: 'Stage Surface Type', type: 'text', placeholder: 'e.g. Maple hardwood (sprung), plywood, concrete' },
      { key: 'deck_load', label: 'Deck Load Capacity', type: 'text', placeholder: 'e.g. 150 lbs per sq ft' },
      { key: 'wing_sl', label: 'Wing Space — Stage Left', type: 'text', placeholder: "e.g. 12′ wide" },
      { key: 'wing_sr', label: 'Wing Space — Stage Right', type: 'text', placeholder: "e.g. 10′ wide" },
      { key: 'trim_height', label: 'Trim / Grid Height', type: 'text', placeholder: "e.g. 60′ stage to grid" },
      { key: 'foh_distance', label: 'Downstage Edge to FOH', type: 'text', placeholder: "e.g. 70′" },
      { key: 'foh_depth', label: 'FOH Depth', type: 'text', placeholder: "e.g. 12′" },
      { key: 'snake_run', label: 'Snake Run (SR or SL)', type: 'text', placeholder: "e.g. minimum 180′" },
      { key: 'risers', label: 'Risers', type: 'textarea', placeholder: 'e.g. (12) 4×8 risers at 12″ or 24″, static or rolling' },
      { key: 'fly_system', label: 'Fly System Type', type: 'select', options: ['None', 'Manual hemp', 'Single-purchase counterweight', 'Double-purchase counterweight', 'Automated'] },
      { key: 'line_sets', label: 'Number of Line Sets (Battens)', type: 'number', placeholder: 'e.g. 42' },
      { key: 'batten_capacity', label: 'Per-Batten Weight Capacity', type: 'text', placeholder: 'e.g. 1,000 lbs' },
      { key: 'rigging_points', label: 'Motor / Point Load Count & Capacity', type: 'textarea', placeholder: 'e.g. 8 motor points × 2,000 lbs each' },
      { key: 'rigging_inspection', label: 'Rigging Inspection Date', type: 'text', placeholder: 'e.g. March 2026' },
      { key: 'stage_notes', label: 'Notes', type: 'textarea' },
    ],
  },
  {
    key: 'audio',
    label: 'Audio',
    fields: [
      { key: 'foh_console', label: 'FOH Console', type: 'textarea', placeholder: 'e.g. Digico SD9 w/ Waves Package\nDigico SD11 Mix Rack' },
      { key: 'foh_channel_count', label: 'FOH Console Input Channel Count', type: 'number', placeholder: 'e.g. 72' },
      { key: 'console_io_format', label: 'Console I/O Format', type: 'text', placeholder: 'e.g. Dante + analog XLR, MADI, AES' },
      { key: 'touring_console_tie_in', label: 'Touring Console Tie-In Possible?', type: 'boolean' },
      { key: 'monitor_console', label: 'Monitor Console', type: 'textarea', placeholder: 'e.g. Yamaha CS-R3 Rivage PM3' },
      { key: 'monitor_mix_count', label: 'Number of Independent Monitor Mixes', type: 'number', placeholder: 'e.g. 12' },
      { key: 'main_pa', label: 'Main PA', type: 'textarea', placeholder: 'e.g. L-Acoustics K2 × 24 (12 per side)\nL-Acoustics SB28 × 16' },
      { key: 'front_fills', label: 'Front Fills', type: 'textarea', placeholder: 'e.g. L-Acoustics Kara × 6' },
      { key: 'amplifiers', label: 'Amplifiers / Processors', type: 'textarea', placeholder: 'e.g. L-Acoustics LA12X × 17\nL-Acoustics AVB P1 Processor' },
      { key: 'stage_monitors', label: 'Stage Monitors', type: 'textarea', placeholder: 'e.g. L-Acoustics X15 HiQ × 10' },
      { key: 'iem_system', label: 'IEM System', type: 'textarea', placeholder: 'e.g. Shure Axient Digital' },
      { key: 'iem_receiver_count', label: 'IEM Receiver (Bodypack) Count', type: 'number', placeholder: 'e.g. 8' },
      { key: 'iem_frequency_band', label: 'IEM Frequency Band', type: 'text', placeholder: 'e.g. UHF 550–600 MHz' },
      { key: 'wireless_freq_coordination', label: 'Wireless Frequency Coordination Available?', type: 'boolean' },
      { key: 'drum_fill_sidefills', label: 'Drum Fill / Sidefills', type: 'textarea', placeholder: 'e.g. L-Acoustics X15 + KS21 drum fill\nL-Acoustics KS21 + A15 sidefills × 4' },
      { key: 'microphones', label: 'Microphones', type: 'textarea', placeholder: 'e.g. 6× Sennheiser E604\n5× Shure SM58\n8× Shure Beta 58A\n6× Shure SM57' },
      { key: 'di_boxes', label: 'DI Boxes', type: 'textarea', placeholder: 'e.g. 9× Countryman 85\n4× Whirlwind PCDI\n2× Radial ProD2' },
      { key: 'wireless', label: 'Wireless Systems', type: 'textarea', placeholder: 'e.g. 1× Shure AD2 Handheld\n2× Shure AD2 Lav Beltpack' },
      { key: 'comms', label: 'Comms', type: 'textarea', placeholder: 'e.g. All wired. All positions have headsets. 6 additional packs available.' },
      { key: 'decibel_limit', label: 'Decibel Limit', type: 'text', placeholder: 'e.g. 105dB maximum' },
      { key: 'audio_notes', label: 'Notes', type: 'textarea' },
    ],
  },
  {
    key: 'lighting',
    label: 'Lighting',
    fields: [
      { key: 'console', label: 'Console', type: 'text', placeholder: 'e.g. grandMA3 Full' },
      { key: 'console_universes', label: 'DMX Universe Count', type: 'number', placeholder: 'e.g. 16' },
      { key: 'console_network', label: 'Network Protocol', type: 'text', placeholder: 'e.g. Art-Net, sACN, Ethernet' },
      { key: 'guest_console', label: 'Guest LD Can Bring Own Console?', type: 'boolean' },
      { key: 'moving_lights', label: 'Moving Lights', type: 'textarea', placeholder: 'e.g. 12× Martin MAC Viper Profile\n4× Martin MAC Viper Performance\n6× Martin MAC 700 Profile' },
      { key: 'wash_led', label: 'Wash / LED Fixtures', type: 'textarea', placeholder: 'e.g. 14× Chauvet Rogue Outcast 2X LED Wash\n6× Colorado 1-Quad Zoom Tour' },
      { key: 'beam_fixtures', label: 'Beam Fixtures', type: 'textarea', placeholder: 'e.g. 22× Chauvet Legend 230SR Beam' },
      { key: 'conventional_fixtures', label: 'Conventional Fixtures', type: 'textarea', placeholder: 'e.g. 24× Par 64 (1kW)\n12× ETC Source Four 26°\n6× Fresnel 2kW' },
      { key: 'strobe_blinder', label: 'Strobe / Blinder', type: 'textarea', placeholder: 'e.g. 16× Chauvet Strike Array 4\n16× Chauvet ColorStrike M Strobe' },
      { key: 'follow_spots', label: 'Follow Spots', type: 'textarea', placeholder: 'e.g. 2× Super Trouper 2K\n2× Lycian LTI 400' },
      { key: 'haze_fog', label: 'Haze / Fog / Atmosphere', type: 'textarea', placeholder: 'e.g. 2× Chauvet Amhaze Stadium\n1× Ultratec Radiance Hazer (fire guard required)' },
      { key: 'lasers', label: 'Lasers', type: 'textarea', placeholder: 'e.g. 8× 20W Kvant Lasers' },
      { key: 'truss_positions', label: 'Truss Positions & Load Capacities', type: 'textarea', placeholder: 'e.g. FOH 1 & 2: 12ft box truss, 1,000 lbs each\nOverhead LX-1 & LX-2: 30ft box truss, 2,000 lbs each' },
      { key: 'lighting_notes', label: 'Notes', type: 'textarea' },
    ],
  },
  {
    key: 'video',
    label: 'Video',
    fields: [
      { key: 'led_wall', label: 'LED Wall', type: 'textarea', placeholder: 'e.g. Absen A7 LED Wall\nNovastar Pro Processor Rack' },
      { key: 'projector_screen', label: 'Projector / Screen', type: 'textarea', placeholder: "e.g. Eiki LC-X800 12K Lumens\n37′W × 19′6″H screen, 4th electric (22′5″ from apron)" },
      { key: 'video_inputs', label: 'Video Input Types', type: 'text', placeholder: 'e.g. HDMI, SDI, DisplayPort' },
      { key: 'cameras', label: 'Cameras', type: 'textarea', placeholder: 'e.g. PTZs and Long Lens Package' },
      { key: 'video_switcher', label: 'Video Switcher / Control', type: 'textarea', placeholder: 'e.g. FOR-A HVS-300 Production Switcher\n2× MacBook Pro M2' },
      { key: 'dj_booth', label: 'DJ Booth Specs', type: 'textarea', placeholder: 'e.g. Image area 540px × 1080px (DJ booth)\n540px × 1080px (side screens)' },
      { key: 'video_notes', label: 'Notes', type: 'textarea' },
    ],
  },
  {
    key: 'power',
    label: 'Power',
    fields: [
      { key: 'service_type', label: 'Service Type', type: 'select', options: ['Single-phase', 'Three-phase (wye)', 'Three-phase (delta)'] },
      { key: 'voltage', label: 'Voltage', type: 'text', placeholder: 'e.g. 120/208V' },
      { key: 'total_service', label: 'Total Service Size', type: 'text', placeholder: 'e.g. 800A' },
      { key: 'available_to_production', label: 'Available to Touring Production', type: 'text', placeholder: 'e.g. 400A (note: total service ≠ available)' },
      { key: 'lighting_power', label: 'Lighting Power', type: 'text', placeholder: 'e.g. 400A at SL panel' },
      { key: 'audio_power', label: 'Audio Power', type: 'text', placeholder: 'e.g. 200A at SL panel' },
      { key: 'power_location', label: 'Panel Locations & Distance to Stage', type: 'textarea', placeholder: 'e.g. SL wing panel: 15ft from stage edge\nSR wing panel: 12ft from stage edge\nFOH panel: in booth' },
      { key: 'distro_type', label: 'Distro / Connector Type', type: 'text', placeholder: 'e.g. Cam-Lok, L14-30R, L21-30R' },
      { key: 'shore_power', label: 'Shore Power Available', type: 'boolean' },
      { key: 'generator_available', label: 'Generator Available', type: 'boolean' },
      { key: 'power_known_issues', label: 'Known Issues / Limitations', type: 'textarea', placeholder: 'e.g. Dimmer bank 3 limited to 80% load. Voltage drop on long cable runs to FOH.' },
      { key: 'power_notes', label: 'Notes', type: 'textarea' },
    ],
  },
  {
    key: 'backline',
    label: 'Backline / Festival Gear',
    fields: [
      { key: 'dj_gear', label: 'DJ Gear', type: 'textarea', placeholder: 'e.g. 4× CDJ3000\n1× DJM-A9\n1× DJM V10' },
      { key: 'drum_kit', label: 'Drum Kit', type: 'textarea', placeholder: 'e.g. Pearl Masters, 5-piece' },
      { key: 'guitar_amps', label: 'Guitar Amps', type: 'textarea', placeholder: 'e.g. 2× Fender Twin Reverb' },
      { key: 'bass_amps', label: 'Bass Amps', type: 'textarea', placeholder: 'e.g. Ampeg SVT-4' },
      { key: 'keyboards', label: 'Keyboards / Other', type: 'textarea', placeholder: 'e.g. Nord Stage 3' },
      { key: 'local_rental', label: 'Local Backline Rental Company', type: 'text', placeholder: 'Company name · contact · phone' },
      { key: 'backline_notes', label: 'Notes', type: 'textarea' },
    ],
  },
  {
    key: 'load_in',
    label: 'Load-In & Parking',
    fields: [
      { key: 'dock_height', label: 'Dock Height Above Ground', type: 'text', placeholder: 'e.g. 48 inches' },
      { key: 'dock_door_dimensions', label: 'Dock Door Dimensions (W × H)', type: 'text', placeholder: "e.g. 10′ × 12′" },
      { key: 'dock_bays', label: 'Number of Loading Bays', type: 'number', placeholder: 'e.g. 2' },
      { key: 'dock_leveler', label: 'Dock Leveler Type', type: 'select', options: ['None', 'Dock plate (manual)', 'Mechanical', 'Hydraulic', 'Electric hydraulic'] },
      { key: 'dock_access_hours', label: 'Dock Access Hours', type: 'text', placeholder: 'e.g. 7:00 AM – 2:00 AM' },
      { key: 'forklift', label: 'Forklift Available?', type: 'boolean' },
      { key: 'pallet_jack', label: 'Pallet Jack Available?', type: 'boolean' },
      { key: 'load_in_access', label: 'Load-In Access Notes', type: 'textarea', placeholder: 'Push distance, surface type, overhead clearance, weather protection, any restrictions' },
      { key: 'freight_elevator', label: 'Freight Elevator', type: 'text', placeholder: "e.g. 11′4″W × 7′11″T × 10′1″D" },
      { key: 'stage_clearance', label: 'Stage Clearance (elevator to stage)', type: 'text', placeholder: "e.g. just under 8′W × 7′11″H" },
      { key: 'dead_case_storage', label: 'Dead Case Storage', type: 'textarea', placeholder: "e.g. 28′W × 10′D, SR of elevator before double doors" },
      { key: 'truck_parking', label: 'Truck / Trailer Parking', type: 'textarea', placeholder: 'Location, number of spaces, surface type' },
      { key: 'bus_parking', label: 'Tour Bus Parking', type: 'textarea', placeholder: 'Location, number of spaces' },
      { key: 'crew_parking', label: 'Crew / Personal Vehicle Parking', type: 'textarea', placeholder: 'Location, distance from venue' },
      { key: 'overnight_parking', label: 'Overnight Parking Allowed?', type: 'boolean' },
      { key: 'shore_power_parking', label: 'Shore Power at Parking?', type: 'boolean' },
      { key: 'load_in_notes', label: 'Notes', type: 'textarea' },
    ],
  },
  {
    key: 'crew',
    label: 'Crew & Labor',
    fields: [
      { key: 'union_affiliation', label: 'Union Affiliation', type: 'select', options: ['Non-union', 'IATSE', 'IBEW', 'Teamsters', 'Mixed / depends on call'] },
      { key: 'mandatory_crew', label: 'Mandatory House Crew Required?', type: 'boolean' },
      { key: 'min_stagehands', label: 'Minimum Stagehand Count', type: 'number', placeholder: 'e.g. 4' },
      { key: 'crew_cost', label: 'Crew Cost', type: 'text', placeholder: 'e.g. Included up to 4 hrs; overtime billed at $X/hr' },
      { key: 'union_meal_break', label: 'Union Meal Break Requirements', type: 'text', placeholder: 'e.g. 1 hr break after every 4 hrs worked' },
      { key: 'available_crew', label: 'Available Local Stagehand Count', type: 'number', placeholder: 'e.g. 12' },
      { key: 'crew_skill_level', label: 'Crew Skill Level', type: 'text', placeholder: 'e.g. Experienced with touring productions' },
      { key: 'crew_notes', label: 'Notes', type: 'textarea' },
    ],
  },
  {
    key: 'hospitality',
    label: 'Hospitality',
    fields: [
      { key: 'dressing_rooms', label: 'Dressing Rooms', type: 'textarea', placeholder: 'e.g. 5 rooms: 1 star, 2 large, 2 small. All with restroom & shower. Located upstage, accessible SR or SL.' },
      { key: 'green_room_count', label: 'Green Room Count', type: 'number', placeholder: 'e.g. 2' },
      { key: 'green_room_capacity', label: 'Green Room Capacity (people)', type: 'text', placeholder: 'e.g. GR1: 15 people · GR2: 8 people' },
      { key: 'showers', label: 'Showers Available?', type: 'boolean' },
      { key: 'shower_count', label: 'Number of Shower Stalls', type: 'number', placeholder: 'e.g. 2' },
      { key: 'catering_room', label: 'Catering Room', type: 'boolean' },
      { key: 'venue_catering', label: 'Venue-Provided Catering', type: 'textarea', placeholder: 'e.g. Water, coffee, soft drinks provided. Alcohol available. Full catering with 72-hr notice (additional cost).' },
      { key: 'laundry', label: 'Washer / Dryer', type: 'boolean' },
      { key: 'ice_machine', label: 'Ice Machine Available?', type: 'boolean' },
      { key: 'wifi', label: 'WiFi Available', type: 'boolean' },
      { key: 'wifi_notes', label: 'WiFi Notes', type: 'text', placeholder: 'e.g. Credentials posted in dressing rooms. Hard-wired in production office.' },
      { key: 'production_office', label: 'Touring Production Office', type: 'boolean' },
      { key: 'production_office_location', label: 'Production Office Location', type: 'text', placeholder: 'e.g. End of dressing room hallway, past SL entrance' },
      { key: 'merchandise', label: 'Merchandise', type: 'textarea', placeholder: 'Location, space, tax rate, advance contact' },
      { key: 'security', label: 'Security', type: 'textarea', placeholder: 'e.g. Open gate system at entry. Metal detector available on request.' },
      { key: 'hospitality_notes', label: 'Notes', type: 'textarea' },
    ],
  },
]
