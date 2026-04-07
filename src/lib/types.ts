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
// Packet section definitions — based on real production tech packets
// (FL Groves festival + The Midland Theatre)
// Gear list fields use textarea so venues can enter multiple items.
// ============================================================

export type SectionKey =
  | 'contacts'
  | 'stage'
  | 'audio'
  | 'lighting'
  | 'video'
  | 'power'
  | 'backline'
  | 'load_in'
  | 'hospitality'

export interface FieldDefinition {
  key: string
  label: string
  type: 'text' | 'number' | 'select' | 'textarea' | 'boolean'
  options?: string[]
  placeholder?: string
}

export interface SectionDefinition {
  key: SectionKey
  label: string
  fields: FieldDefinition[]
}

export const PACKET_SECTIONS: SectionDefinition[] = [
  {
    key: 'contacts',
    label: 'Contacts',
    fields: [
      { key: 'production_manager', label: 'Production Manager', type: 'text', placeholder: 'Name · email · phone' },
      { key: 'general_manager', label: 'General Manager', type: 'text', placeholder: 'Name · email' },
      { key: 'advance_contact', label: 'Advance Contact', type: 'text', placeholder: 'Name · email' },
      { key: 'vip_merch_contact', label: 'VIP / Merch Contact', type: 'text', placeholder: 'Name · email' },
      { key: 'box_office', label: 'Box Office', type: 'text', placeholder: 'Name · email · hours' },
      { key: 'additional_contacts', label: 'Additional Contacts', type: 'textarea', placeholder: 'Any other key contacts and roles...' },
    ],
  },
  {
    key: 'stage',
    label: 'Stage',
    fields: [
      { key: 'full_deck', label: 'Full Deck (W × D × H)', type: 'text', placeholder: "e.g. 86′ × 34′ × 3′5″" },
      { key: 'performance_area', label: 'Performance Area (W × D)', type: 'text', placeholder: "e.g. 47′10″ × 28′" },
      { key: 'trim_height', label: 'Trim / Grid Height', type: 'text', placeholder: "e.g. 60′ stage to grid" },
      { key: 'foh_distance', label: 'Downstage Edge to FOH', type: 'text', placeholder: "e.g. 70′" },
      { key: 'foh_depth', label: 'FOH Depth', type: 'text', placeholder: "e.g. 12′" },
      { key: 'snake_run', label: 'Snake Run (SR or SL)', type: 'text', placeholder: "e.g. minimum 180′" },
      { key: 'risers', label: 'Risers', type: 'textarea', placeholder: 'e.g. (12) 4×8 risers at 12″ or 24″, static or rolling' },
      { key: 'stage_notes', label: 'Notes', type: 'textarea' },
    ],
  },
  {
    key: 'audio',
    label: 'Audio',
    fields: [
      { key: 'foh_console', label: 'FOH Console', type: 'textarea', placeholder: 'e.g. Digico SD9 w/ Waves Package\nDigico SD11 Mix Rack' },
      { key: 'monitor_console', label: 'Monitor Console', type: 'textarea', placeholder: 'e.g. Yamaha CS-R3 Rivage PM3' },
      { key: 'main_pa', label: 'Main PA', type: 'textarea', placeholder: 'e.g. L-Acoustics K2 × 24 (12 per side)\nL-Acoustics SB28 × 16' },
      { key: 'front_fills', label: 'Front Fills', type: 'textarea', placeholder: 'e.g. L-Acoustics Kara × 6' },
      { key: 'amplifiers', label: 'Amplifiers / Processors', type: 'textarea', placeholder: 'e.g. L-Acoustics LA12X × 17\nL-Acoustics AVB P1 Processor' },
      { key: 'stage_monitors', label: 'Stage Monitors', type: 'textarea', placeholder: 'e.g. L-Acoustics X15 HiQ × 10' },
      { key: 'iem_system', label: 'IEM System', type: 'textarea', placeholder: 'e.g. Shure Axient Wireless × 2' },
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
      { key: 'moving_lights', label: 'Moving Lights', type: 'textarea', placeholder: 'e.g. 12× Martin MAC Viper Profile\n4× Martin MAC Viper Performance\n6× Martin MAC 700 Profile' },
      { key: 'wash_led', label: 'Wash / LED Fixtures', type: 'textarea', placeholder: 'e.g. 14× Chauvet Rogue Outcast 2X LED Wash\n6× Colorado 1-Quad Zoom Tour' },
      { key: 'beam_fixtures', label: 'Beam Fixtures', type: 'textarea', placeholder: 'e.g. 22× Chauvet Legend 230SR Beam' },
      { key: 'strobe_blinder', label: 'Strobe / Blinder', type: 'textarea', placeholder: 'e.g. 16× Chauvet Strike Array 4\n16× Chauvet ColorStrike M Strobe' },
      { key: 'follow_spots', label: 'Follow Spots', type: 'textarea', placeholder: 'e.g. 2× Super Trouper 2K\n2× Lycian LTI 400' },
      { key: 'haze_fog', label: 'Haze / Fog / Atmosphere', type: 'textarea', placeholder: 'e.g. 2× Chauvet Amhaze Stadium\n1× Ultratec Radiance Hazer (fire guard required)' },
      { key: 'lasers', label: 'Lasers', type: 'textarea', placeholder: 'e.g. 8× 20W Kvant Lasers' },
      { key: 'lighting_notes', label: 'Notes', type: 'textarea' },
    ],
  },
  {
    key: 'video',
    label: 'Video',
    fields: [
      { key: 'led_wall', label: 'LED Wall', type: 'textarea', placeholder: 'e.g. Absen A7 LED Wall\nNovastar Pro Processor Rack' },
      { key: 'projector_screen', label: 'Projector / Screen', type: 'textarea', placeholder: "e.g. Eiki LC-X800 12K Lumens\n37′W × 19′6″H screen, 4th electric (22′5″ from apron)" },
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
      { key: 'lighting_power', label: 'Lighting Power', type: 'text', placeholder: 'e.g. 400A' },
      { key: 'audio_power', label: 'Audio Power', type: 'text', placeholder: 'e.g. 200A' },
      { key: 'power_location', label: 'Power Location', type: 'text', placeholder: 'e.g. All power located SL' },
      { key: 'distro_type', label: 'Distro / Connector Type', type: 'text', placeholder: 'e.g. Cam-Lok' },
      { key: 'shore_power', label: 'Shore Power Available', type: 'boolean' },
      { key: 'generator_available', label: 'Generator Available', type: 'boolean' },
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
      { key: 'backline_notes', label: 'Notes', type: 'textarea' },
    ],
  },
  {
    key: 'load_in',
    label: 'Load In & Parking',
    fields: [
      { key: 'load_in_access', label: 'Load-In Access', type: 'textarea', placeholder: 'Describe dock location, entrance, push distance, surface type' },
      { key: 'freight_elevator', label: 'Freight Elevator', type: 'text', placeholder: "e.g. 11′4″W × 7′11″T × 10′1″D" },
      { key: 'stage_clearance', label: 'Stage Clearance (elevator to stage)', type: 'text', placeholder: "e.g. just under 8′W × 7′11″H" },
      { key: 'dead_case_storage', label: 'Dead Case Storage', type: 'textarea', placeholder: "e.g. 28′W × 10′ wide, SR of elevator before double doors" },
      { key: 'parking', label: 'Parking', type: 'textarea', placeholder: 'e.g. Street parking only. Semi trucks / buses park opposite direction of traffic.' },
      { key: 'shore_power_parking', label: 'Shore Power (Parking)', type: 'boolean' },
      { key: 'load_in_notes', label: 'Notes', type: 'textarea' },
    ],
  },
  {
    key: 'hospitality',
    label: 'Hospitality',
    fields: [
      { key: 'dressing_rooms', label: 'Dressing Rooms', type: 'textarea', placeholder: 'e.g. 5 rooms: 1 star, 2 large, 2 small. All with restroom & shower. Located upstage, accessible SR or SL.' },
      { key: 'catering_room', label: 'Catering Room', type: 'boolean' },
      { key: 'laundry', label: 'Washer / Dryer', type: 'boolean' },
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
