export type UserRole = 'venue' | 'artist'

export interface Profile {
  id: string
  role: UserRole
  display_name: string | null
  created_at: string
  updated_at: string
}

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
export interface PacketSection {
  id: string
  packet_id: string
  section_key: SectionKey
  section_label: string
  fields: Record<string, string | number | boolean | null>
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
// Packet section definitions
// These are placeholder sections — update field labels/keys
// once you have the real technical packet to work from.
// ============================================================

export type SectionKey = 'stage' | 'audio' | 'lighting' | 'power' | 'backline' | 'logistics'

export interface FieldDefinition {
  key: string
  label: string
  type: 'text' | 'number' | 'select' | 'textarea' | 'boolean'
  options?: string[]  // for select fields
  placeholder?: string
}

export interface SectionDefinition {
  key: SectionKey
  label: string
  fields: FieldDefinition[]
}

export const PACKET_SECTIONS: SectionDefinition[] = [
  {
    key: 'stage',
    label: 'Stage',
    fields: [
      { key: 'stage_width', label: 'Stage Width', type: 'text', placeholder: 'e.g. 40ft' },
      { key: 'stage_depth', label: 'Stage Depth', type: 'text', placeholder: 'e.g. 30ft' },
      { key: 'stage_height', label: 'Stage Height', type: 'text', placeholder: 'e.g. 4ft' },
      { key: 'stage_type', label: 'Stage Type', type: 'select', options: ['Permanent', 'Portable', 'Thrust', 'In-the-round', 'Other'] },
      { key: 'stage_surface', label: 'Stage Surface', type: 'text', placeholder: 'e.g. Wood, Carpet' },
      { key: 'load_capacity', label: 'Load Capacity', type: 'text', placeholder: 'e.g. 2000 lbs' },
      { key: 'notes', label: 'Notes', type: 'textarea' },
    ],
  },
  {
    key: 'audio',
    label: 'Audio',
    fields: [
      { key: 'foh_console', label: 'FOH Console', type: 'text', placeholder: 'e.g. Yamaha CL5' },
      { key: 'monitor_console', label: 'Monitor Console', type: 'text', placeholder: 'e.g. Yamaha PM5D' },
      { key: 'main_pa', label: 'Main PA System', type: 'text', placeholder: 'e.g. L-Acoustics K2' },
      { key: 'monitors', label: 'Stage Monitors', type: 'text', placeholder: 'e.g. d&b M4, 8 mixes' },
      { key: 'di_count', label: 'DI Box Count', type: 'number', placeholder: 'e.g. 12' },
      { key: 'in_ear_provided', label: 'In-Ears Provided', type: 'boolean' },
      { key: 'notes', label: 'Notes', type: 'textarea' },
    ],
  },
  {
    key: 'lighting',
    label: 'Lighting',
    fields: [
      { key: 'console', label: 'Lighting Console', type: 'text', placeholder: 'e.g. grandMA3' },
      { key: 'moving_lights', label: 'Moving Lights', type: 'text', placeholder: 'e.g. 24x Robe BMFL' },
      { key: 'led_wash', label: 'LED Wash', type: 'text', placeholder: 'e.g. 16x Chauvet COLORado' },
      { key: 'follow_spots', label: 'Follow Spots', type: 'number', placeholder: 'e.g. 2' },
      { key: 'haze_machine', label: 'Haze / Fog', type: 'boolean' },
      { key: 'notes', label: 'Notes', type: 'textarea' },
    ],
  },
  {
    key: 'power',
    label: 'Power',
    fields: [
      { key: 'available_power', label: 'Available Power', type: 'text', placeholder: 'e.g. 400A 3-phase' },
      { key: 'distro_type', label: 'Distro Type', type: 'text', placeholder: 'e.g. Cam-Lok' },
      { key: 'distance_from_stage', label: 'Distance from Stage', type: 'text', placeholder: 'e.g. 50ft' },
      { key: 'generator_available', label: 'Generator Available', type: 'boolean' },
      { key: 'notes', label: 'Notes', type: 'textarea' },
    ],
  },
  {
    key: 'backline',
    label: 'Backline',
    fields: [
      { key: 'drum_kit', label: 'Drum Kit', type: 'text', placeholder: 'e.g. Pearl Masters, 5-piece' },
      { key: 'guitar_amps', label: 'Guitar Amps', type: 'text', placeholder: 'e.g. 2x Fender Twin Reverb' },
      { key: 'bass_amps', label: 'Bass Amps', type: 'text', placeholder: 'e.g. Ampeg SVT-4' },
      { key: 'keyboards', label: 'Keyboards', type: 'text', placeholder: 'e.g. Nord Stage 3' },
      { key: 'notes', label: 'Notes', type: 'textarea' },
    ],
  },
  {
    key: 'logistics',
    label: 'Logistics',
    fields: [
      { key: 'load_in_access', label: 'Load-In Access', type: 'textarea', placeholder: 'Describe load-in dock, door size, restrictions' },
      { key: 'parking', label: 'Parking', type: 'textarea', placeholder: 'Tour bus / truck parking details' },
      { key: 'production_office', label: 'Production Office', type: 'boolean' },
      { key: 'green_rooms', label: 'Green Rooms', type: 'number', placeholder: 'Number of green rooms' },
      { key: 'catering', label: 'Catering / Kitchen', type: 'boolean' },
      { key: 'wifi', label: 'WiFi Available', type: 'boolean' },
      { key: 'notes', label: 'Notes', type: 'textarea' },
    ],
  },
]
