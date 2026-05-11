import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/server'
import type { TechRiderSection, PacketSection, FieldConfirmation } from '@/lib/types'

interface Props {
  params: Promise<{ token: string }>
}

type SectionMap = Map<string, Record<string, string | number | boolean | null>>

function buildMap(sections: TechRiderSection[] | PacketSection[]): SectionMap {
  return new Map(sections.map(s => [s.section_key, s.fields]))
}

function val(map: SectionMap, section: string, field: string): string {
  const v = map.get(section)?.[field]
  if (v == null || v === '') return ''
  if (typeof v === 'boolean') return v ? 'Yes' : 'No'
  return String(v)
}

function field(advance: Record<string, string | null>, key: string): string {
  return advance[key] ?? ''
}

export default async function SharePage({ params }: Props) {
  const { token } = await params
  const supabase = createAdminClient()

  // Look up the share link — day sheet tokens must not expose the full advance
  const { data: share } = await supabase
    .from('advance_shares')
    .select('advance_id, show_id, type')
    .eq('token', token)
    .single()

  if (!share) notFound()
  if (share.type === 'day_sheet') notFound()

  // Fetch all data in parallel
  const [advanceResult, showResult] = await Promise.all([
    supabase.from('show_advances').select('fields, field_confirmations').eq('id', share.advance_id).single(),
    supabase.from('shows').select('*, venues(id, name, address, city, state, capacity), tours(id, tour_name, artist_name)').eq('id', share.show_id).single(),
  ])

  if (!advanceResult.data || !showResult.data) notFound()

  const show = showResult.data
  const venue = show.venues as { id: string; name: string; address: string | null; city: string | null; state: string | null; capacity: number | null } | null
  const tour = show.tours as { id: string; tour_name: string; artist_name: string } | null
  const advanceFields = (advanceResult.data.fields ?? {}) as Record<string, string | null>
  const confirmations = (advanceResult.data.field_confirmations ?? {}) as Record<string, FieldConfirmation>

  // Fetch rider + packet in parallel
  const [riderResult, packetResult] = await Promise.all([
    show.tour_id
      ? supabase.from('tech_riders').select('id').eq('tour_id', show.tour_id).single()
      : Promise.resolve({ data: null }),
    venue?.id
      ? supabase.from('technical_packets').select('id').eq('venue_id', venue.id).single()
      : Promise.resolve({ data: null }),
  ])

  const riderSections: TechRiderSection[] = []
  if (riderResult.data) {
    const { data } = await supabase.from('tech_rider_sections').select('*').eq('rider_id', riderResult.data.id)
    if (data) riderSections.push(...data)
  }

  const packetSections: PacketSection[] = []
  if (packetResult.data) {
    const { data } = await supabase.from('packet_sections').select('*').eq('packet_id', packetResult.data.id)
    if (data) packetSections.push(...data)
  }

  const rider = buildMap(riderSections)
  const packet = buildMap(packetSections)

  const formattedDate = new Date(show.event_date + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  })

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Header */}
      <div className="bg-white border-b border-zinc-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-0.5">StagePage · Advance Sheet</p>
            <h1 className="text-lg font-bold text-zinc-900">
              {tour?.artist_name ?? 'Advance Sheet'}
              {venue && <span className="font-normal text-zinc-500"> · {venue.name}</span>}
            </h1>
            <p className="text-sm text-zinc-500">{formattedDate}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-zinc-400">Read-only shared view</p>
            {tour && <p className="text-xs text-zinc-400">{tour.tour_name}</p>}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">

        {/* Source legend */}
        <div className="flex items-center gap-4 flex-wrap">
          <p className="text-xs text-zinc-400">Sources:</p>
          <SourceChip label="Tech Rider" color="violet" />
          <SourceChip label="Venue Packet" color="blue" />
          <SourceChip label="Show" color="zinc" />
        </div>

        {/* Hot Points */}
        <ReadSection title="Hot Points">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            <HotField label="Stage Dims"   value={val(packet, 'stage', 'full_deck')}          confirmation={confirmations['stage.full_deck']} />
            <HotField label="Wing SL"      value={val(packet, 'stage', 'wing_sl')}            confirmation={confirmations['stage.wing_sl']} />
            <HotField label="Wing SR"      value={val(packet, 'stage', 'wing_sr')}            confirmation={confirmations['stage.wing_sr']} />
            <HotField label="Trim Height"  value={val(packet, 'stage', 'trim_height')}        confirmation={confirmations['stage.trim_height']} />
            <HotField label="Docks"        value={val(packet, 'load_in', 'dock_bays')}        confirmation={confirmations['load_in.dock_bays']} />
            <HotField label="Dock Height"  value={val(packet, 'load_in', 'dock_height')}      confirmation={confirmations['load_in.dock_height']} />
            <HotField label="SPL Limit"    value={val(packet, 'audio', 'decibel_limit')}      confirmation={confirmations['audio.decibel_limit']} />
            <HotField label="Hard Curfew"  value={val(packet, 'schedule', 'hard_curfew')}     confirmation={confirmations['schedule.hard_curfew']} />
            <HotField label="Crew Access"  value={val(packet, 'schedule', 'crew_access')}     confirmation={confirmations['schedule.crew_access']} />
            <HotField label="Internet"     value={val(packet, 'hospitality', 'wifi_notes')}   confirmation={confirmations['hospitality.wifi_notes']} />
            <HotField label="Union"        value={val(packet, 'crew', 'union_affiliation')}   confirmation={confirmations['crew.union_affiliation']} />
            <HotField label="Service Type" value={val(packet, 'power', 'service_type')}       confirmation={confirmations['power.service_type']} />
          </div>
        </ReadSection>

        {/* Show */}
        <ReadSection title="Show">
          <ReadGrid>
            <ReadField label="Date"            value={formattedDate} source="show" />
            <ReadField label="Venue"           value={venue?.name ?? ''} source="show" />
            <ReadField label="Address"         value={[venue?.address, venue?.city, venue?.state].filter(Boolean).join(', ')} source="show" />
            <ReadField label="Capacity"        value={venue?.capacity ? venue.capacity.toLocaleString() : ''} source="show" />
            <ReadField label="Age Restrictions"    value={field(advanceFields, 'age_restrictions')} source="show" confirmation={confirmations['age_restrictions']} />
            <ReadField label="Indoor / Outdoor"    value={field(advanceFields, 'indoor_outdoor')} source="show" confirmation={confirmations['indoor_outdoor']} />
            <ReadField label="Time Zone"           value={field(advanceFields, 'time_zone')} source="show" confirmation={confirmations['time_zone']} />
            <ReadField label="Promoter / Rep"      value={field(advanceFields, 'promoter_rep')} source="show" confirmation={confirmations['promoter_rep']} />
            <ReadField label="Settlement Contact"  value={field(advanceFields, 'settlement_contact')} source="show" confirmation={confirmations['settlement_contact']} />
            <ReadField label="Deal Type"           value={field(advanceFields, 'deal_type')} source="show" confirmation={confirmations['deal_type']} />
            <ReadField label="Deal Notes"          value={field(advanceFields, 'deal_notes')} source="show" span2 confirmation={confirmations['deal_notes']} />
          </ReadGrid>
        </ReadSection>

        {/* Movement */}
        <ReadSection title="Movement">
          <ReadGrid>
            <ReadField label="Buses"              value={val(rider, 'tour_info', 'bus_count')} source="rider" />
            <ReadField label="Trucks"             value={val(rider, 'tour_info', 'truck_count')} source="rider" />
            <ReadField label="Coming From"        value={field(advanceFields, 'coming_from')} source="show" confirmation={confirmations['coming_from']} />
            <ReadField label="Estimated Arrival"  value={field(advanceFields, 'estimated_arrival')} source="show" confirmation={confirmations['estimated_arrival']} />
            <ReadField label="Estimated Departure" value={field(advanceFields, 'estimated_departure')} source="show" confirmation={confirmations['estimated_departure']} />
            <ReadField label="Next City / Venue"  value={field(advanceFields, 'next_city')} source="show" confirmation={confirmations['next_city']} />
            <ReadField label="Arrival Notes"      value={field(advanceFields, 'arrival_notes')} source="show" span2 confirmation={confirmations['arrival_notes']} />
          </ReadGrid>
        </ReadSection>

        {/* Contacts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ReadSection title="Venue Team">
            <div className="space-y-2">
              <ReadField label="Production Manager"      value={val(packet, 'contacts', 'production_manager')} source="packet" confirmation={confirmations['contacts.production_manager']} />
              <ReadField label="General Manager"         value={val(packet, 'contacts', 'general_manager')} source="packet" confirmation={confirmations['contacts.general_manager']} />
              <ReadField label="Advance Contact"         value={val(packet, 'contacts', 'advance_contact')} source="packet" confirmation={confirmations['contacts.advance_contact']} />
              <ReadField label="House Sound"             value={val(packet, 'contacts', 'house_sound_engineer')} source="packet" confirmation={confirmations['contacts.house_sound_engineer']} />
              <ReadField label="House LD"                value={val(packet, 'contacts', 'house_ld')} source="packet" confirmation={confirmations['contacts.house_ld']} />
              <ReadField label="Head Rigger"             value={val(packet, 'contacts', 'head_rigger')} source="packet" confirmation={confirmations['contacts.head_rigger']} />
              <ReadField label="Stage Manager"           value={val(packet, 'contacts', 'stage_manager')} source="packet" confirmation={confirmations['contacts.stage_manager']} />
              <ReadField label="Security Contact"        value={val(packet, 'contacts', 'security_contact')} source="packet" confirmation={confirmations['contacts.security_contact']} />
              <ReadField label="Emergency / After Hours" value={val(packet, 'contacts', 'emergency_contact')} source="packet" confirmation={confirmations['contacts.emergency_contact']} />
              <ReadField label="Box Office"              value={val(packet, 'contacts', 'box_office')} source="packet" confirmation={confirmations['contacts.box_office']} />
            </div>
          </ReadSection>
          <ReadSection title="Tour Contacts">
            <div className="space-y-2">
              <ReadField label="Tour Manager"         value={val(rider, 'tour_info', 'tour_manager')} source="rider" />
              <ReadField label="Production Manager"   value={val(rider, 'tour_info', 'production_manager')} source="rider" />
              <ReadField label="Production Assistant" value={val(rider, 'tour_info', 'production_assistant')} source="rider" />
              <ReadField label="Tour Merch"           value={val(rider, 'tour_info', 'merch')} source="rider" />
              <ReadField label="Lead Driver"          value={val(rider, 'tour_info', 'lead_driver')} source="rider" />
            </div>
          </ReadSection>
        </div>

        {/* Schedule */}
        <ReadSection title="Schedule">
          <ReadGrid>
            <ReadField label="Earliest Crew Access" value={val(packet, 'schedule', 'crew_access')} source="packet" confirmation={confirmations['schedule.crew_access']} />
            <ReadField label="Load-In Window"       value={val(packet, 'schedule', 'load_in_window')} source="packet" confirmation={confirmations['schedule.load_in_window']} />
            <ReadField label="Soundcheck Window"    value={val(packet, 'schedule', 'soundcheck_window')} source="packet" confirmation={confirmations['schedule.soundcheck_window']} />
            <ReadField label="Doors (venue)"        value={val(packet, 'schedule', 'doors_open')} source="packet" confirmation={confirmations['schedule.doors_open']} />
            <ReadField label="Hard Curfew"          value={val(packet, 'schedule', 'hard_curfew')} source="packet" confirmation={confirmations['schedule.hard_curfew']} />
            <ReadField label="Load-Out Window"      value={val(packet, 'schedule', 'load_out_window')} source="packet" confirmation={confirmations['schedule.load_out_window']} />
            <ReadField label="Curfew Enforcement"   value={field(advanceFields, 'curfew_enforcement')} source="show" span2 confirmation={confirmations['curfew_enforcement']} />
          </ReadGrid>
          <div className="border-t border-zinc-100 pt-4 mt-4">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-3">Show Times</p>
            <ReadGrid>
              <ReadField label="Load-In Call"  value={field(advanceFields, 'load_in_call')} source="show" confirmation={confirmations['load_in_call']} />
              <ReadField label="Doors"         value={field(advanceFields, 'doors_time')} source="show" confirmation={confirmations['doors_time']} />
              <ReadField label="Show Start"    value={field(advanceFields, 'show_start_time')} source="show" confirmation={confirmations['show_start_time']} />
              <ReadField label="Set 1"         value={field(advanceFields, 'set1_duration')} source="show" confirmation={confirmations['set1_duration']} />
              <ReadField label="Set Break"     value={field(advanceFields, 'set_break')} source="show" confirmation={confirmations['set_break']} />
              <ReadField label="Set 2"         value={field(advanceFields, 'set2_duration')} source="show" confirmation={confirmations['set2_duration']} />
              <ReadField label="Encore"        value={field(advanceFields, 'encore_duration')} source="show" confirmation={confirmations['encore_duration']} />
              <ReadField label="Show Curfew"   value={field(advanceFields, 'curfew_time')} source="show" confirmation={confirmations['curfew_time']} />
            </ReadGrid>
          </div>
        </ReadSection>

        {/* Audio + Lighting */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ReadSection title="Audio">
            <div className="space-y-2">
              <ReadField label="Main Hang"          value={val(rider, 'audio', 'main_hang')} source="rider" />
              <ReadField label="Sub"                value={val(rider, 'audio', 'sub')} source="rider" />
              <ReadField label="FOH Console"        value={val(rider, 'audio', 'foh_console')} source="rider" />
              <ReadField label="Monitor Console"    value={val(rider, 'audio', 'monitor_console')} source="rider" />
              <ReadField label="Channels Required"  value={val(rider, 'audio', 'required_channel_count')} source="rider" />
              <ReadField label="Monitor Mixes"      value={val(rider, 'audio', 'required_monitor_mixes')} source="rider" />
              <ReadField label="SPL Limit"          value={val(packet, 'audio', 'decibel_limit')} source="packet" confirmation={confirmations['audio.decibel_limit']} />
              <ReadField label="Venue Console I/O"  value={val(packet, 'audio', 'console_io_format')} source="packet" confirmation={confirmations['audio.console_io_format']} />
              <ReadField label="Tie-In Possible"    value={val(packet, 'audio', 'touring_console_tie_in')} source="packet" confirmation={confirmations['audio.touring_console_tie_in']} />
              <ReadField label="FOH Notes"          value={field(advanceFields, 'foh_notes')} source="show" confirmation={confirmations['foh_notes']} />
              <ReadField label="Monitor Notes"      value={field(advanceFields, 'monitor_notes')} source="show" confirmation={confirmations['monitor_notes']} />
            </div>
          </ReadSection>
          <ReadSection title="Lighting">
            <div className="space-y-2">
              <ReadField label="Console"      value={val(rider, 'lighting', 'lighting_console')} source="rider" />
              <ReadField label="Haze / Fog"   value={val(packet, 'lighting', 'haze_fog')} source="packet" confirmation={confirmations['lighting.haze_fog']} />
              <ReadField label="Follow Spots" value={val(packet, 'lighting', 'follow_spots')} source="packet" confirmation={confirmations['lighting.follow_spots']} />
              <ReadField label="House Rig"    value={val(packet, 'lighting', 'moving_lights')} source="packet" confirmation={confirmations['lighting.moving_lights']} />
              <ReadField label="LD Notes"     value={field(advanceFields, 'ld_notes')} source="show" confirmation={confirmations['ld_notes']} />
            </div>
          </ReadSection>
        </div>

        {/* Stage */}
        <ReadSection title="Stage &amp; Rigging">
          <ReadGrid>
            <ReadField label="Full Deck"         value={val(packet, 'stage', 'full_deck')} source="packet" confirmation={confirmations['stage.full_deck']} />
            <ReadField label="Performance Area"  value={val(packet, 'stage', 'performance_area')} source="packet" confirmation={confirmations['stage.performance_area']} />
            <ReadField label="Wing SL"           value={val(packet, 'stage', 'wing_sl')} source="packet" confirmation={confirmations['stage.wing_sl']} />
            <ReadField label="Wing SR"           value={val(packet, 'stage', 'wing_sr')} source="packet" confirmation={confirmations['stage.wing_sr']} />
            <ReadField label="Stage Height"      value={val(packet, 'stage', 'stage_height')} source="packet" confirmation={confirmations['stage.stage_height']} />
            <ReadField label="Trim Height"       value={val(packet, 'stage', 'trim_height')} source="packet" confirmation={confirmations['stage.trim_height']} />
            <ReadField label="Rigging Points"    value={val(packet, 'stage', 'rigging_points')} source="packet" confirmation={confirmations['stage.rigging_points']} />
            <ReadField label="FOH Distance"      value={val(packet, 'stage', 'foh_distance')} source="packet" confirmation={confirmations['stage.foh_distance']} />
            <ReadField label="Stage Notes"       value={field(advanceFields, 'stage_notes')} source="show" span2 confirmation={confirmations['stage_notes']} />
          </ReadGrid>
        </ReadSection>

        {/* Power */}
        <ReadSection title="Power">
          <ReadGrid>
            <ReadField label="Service Type"     value={val(packet, 'power', 'service_type')} source="packet" confirmation={confirmations['power.service_type']} />
            <ReadField label="Available Load"   value={val(packet, 'power', 'available_load')} source="packet" confirmation={confirmations['power.available_load']} />
            <ReadField label="Audio Power"      value={val(packet, 'power', 'audio_power')} source="packet" confirmation={confirmations['power.audio_power']} />
            <ReadField label="Lighting Power"   value={val(packet, 'power', 'lighting_power')} source="packet" confirmation={confirmations['power.lighting_power']} />
            <ReadField label="Shore Power"      value={val(packet, 'power', 'shore_power')} source="packet" confirmation={confirmations['power.shore_power']} />
            <ReadField label="Known Issues"     value={val(packet, 'power', 'power_known_issues')} source="packet" span2 confirmation={confirmations['power.power_known_issues']} />
            <ReadField label="Power Notes"      value={field(advanceFields, 'power_notes')} source="show" span2 confirmation={confirmations['power_notes']} />
          </ReadGrid>
        </ReadSection>

        {/* Load-In */}
        <ReadSection title="Load-In">
          <ReadGrid>
            <ReadField label="Dock Bays"          value={val(packet, 'load_in', 'dock_bays')} source="packet" confirmation={confirmations['load_in.dock_bays']} />
            <ReadField label="Dock Height"        value={val(packet, 'load_in', 'dock_height')} source="packet" confirmation={confirmations['load_in.dock_height']} />
            <ReadField label="Dock Door Dims"     value={val(packet, 'load_in', 'dock_door_dimensions')} source="packet" confirmation={confirmations['load_in.dock_door_dimensions']} />
            <ReadField label="Forklift"           value={val(packet, 'load_in', 'forklift')} source="packet" confirmation={confirmations['load_in.forklift']} />
            <ReadField label="Bus Parking"        value={val(packet, 'load_in', 'bus_parking')} source="packet" confirmation={confirmations['load_in.bus_parking']} />
            <ReadField label="Truck Parking"      value={val(packet, 'load_in', 'truck_parking')} source="packet" confirmation={confirmations['load_in.truck_parking']} />
            <ReadField label="Load-In Notes"      value={field(advanceFields, 'load_in_notes')} source="show" span2 confirmation={confirmations['load_in_notes']} />
          </ReadGrid>
        </ReadSection>

        {/* Crew & Labor */}
        <ReadSection title="Crew &amp; Labor">
          <ReadGrid>
            <ReadField label="Union Affiliation"  value={val(packet, 'crew', 'union_affiliation')} source="packet" confirmation={confirmations['crew.union_affiliation']} />
            <ReadField label="Mandatory Crew"     value={val(packet, 'crew', 'mandatory_crew')} source="packet" confirmation={confirmations['crew.mandatory_crew']} />
            <ReadField label="Min Stagehands"     value={val(packet, 'crew', 'min_stagehands')} source="packet" confirmation={confirmations['crew.min_stagehands']} />
            <ReadField label="Meal Breaks"        value={val(packet, 'crew', 'meal_breaks')} source="packet" confirmation={confirmations['crew.meal_breaks']} />
            <ReadField label="Tour 1st Call"      value={field(advanceFields, 'crew_first_call')} source="show" confirmation={confirmations['crew_first_call']} />
            <ReadField label="Tour 2nd Call"      value={field(advanceFields, 'crew_second_call')} source="show" confirmation={confirmations['crew_second_call']} />
            <ReadField label="Crew Notes"         value={field(advanceFields, 'crew_notes')} source="show" span2 confirmation={confirmations['crew_notes']} />
          </ReadGrid>
        </ReadSection>

        {/* Hospitality */}
        <ReadSection title="Hospitality">
          <ReadGrid>
            <ReadField label="Dressing Rooms"     value={val(packet, 'hospitality', 'dressing_rooms')} source="packet" confirmation={confirmations['hospitality.dressing_rooms']} />
            <ReadField label="Catering"           value={val(packet, 'hospitality', 'catering')} source="packet" confirmation={confirmations['hospitality.catering']} />
            <ReadField label="WiFi / Internet"    value={val(packet, 'hospitality', 'wifi_notes')} source="packet" confirmation={confirmations['hospitality.wifi_notes']} />
            <ReadField label="Production Office"  value={val(packet, 'hospitality', 'production_office')} source="packet" confirmation={confirmations['hospitality.production_office']} />
            <ReadField label="Hospitality Notes"  value={field(advanceFields, 'hospitality_notes')} source="show" span2 confirmation={confirmations['hospitality_notes']} />
          </ReadGrid>
        </ReadSection>

        {/* Notes */}
        {(field(advanceFields, 'show_notes') || field(advanceFields, 'security_notes') || field(advanceFields, 'additional_notes')) && (
          <ReadSection title="Notes">
            <div className="space-y-3">
              <ReadField label="Show Notes"       value={field(advanceFields, 'show_notes')} source="show" confirmation={confirmations['show_notes']} />
              <ReadField label="Security Notes"   value={field(advanceFields, 'security_notes')} source="show" confirmation={confirmations['security_notes']} />
              <ReadField label="Additional Notes" value={field(advanceFields, 'additional_notes')} source="show" confirmation={confirmations['additional_notes']} />
            </div>
          </ReadSection>
        )}

        <p className="text-center text-xs text-zinc-400 pt-4 border-t border-zinc-200">
          Shared via <span className="font-semibold">StagePage</span> · Read-only view
        </p>
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

type Source = 'rider' | 'packet' | 'show'

const SOURCE_STYLE: Record<Source, string> = {
  rider:  'text-violet-600 bg-violet-50 border-violet-100',
  packet: 'text-blue-600 bg-blue-50 border-blue-100',
  show:   'text-zinc-500 bg-zinc-50 border-zinc-200',
}
const SOURCE_LABEL: Record<Source, string> = {
  rider:  'Tech Rider',
  packet: 'Venue Packet',
  show:   'Show',
}

function SourceChip({ label, color }: { label: string; color: 'violet' | 'blue' | 'zinc' }) {
  const cls =
    color === 'violet' ? 'text-violet-600 bg-violet-50 border-violet-100' :
    color === 'blue'   ? 'text-blue-600 bg-blue-50 border-blue-100' :
    'text-zinc-500 bg-zinc-50 border-zinc-200'
  return (
    <span className={`inline-flex items-center text-[10px] font-medium border rounded px-1.5 py-0.5 ${cls}`}>
      {label}
    </span>
  )
}

function ReadSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white overflow-hidden">
      <div className="px-5 py-3 border-b border-zinc-100 bg-zinc-50">
        <h2 className="text-sm font-semibold text-zinc-700">{title}</h2>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  )
}

function ReadGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">{children}</div>
}

function ConfirmedBadge({ confirmation }: { confirmation: FieldConfirmation | null | undefined }) {
  if (!confirmation) return null
  const date = new Date(confirmation.confirmedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return (
    <span className="inline-flex items-center gap-0.5 text-[9px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1 py-px leading-tight">
      ✓ Confirmed {date}{confirmation.confirmedBy ? ` · ${confirmation.confirmedBy}` : ''}{confirmation.method ? ` · ${confirmation.method}` : ''}
    </span>
  )
}

function ReadField({
  label,
  value,
  source,
  span2 = false,
  confirmation,
}: {
  label: string
  value: string
  source: Source
  span2?: boolean
  confirmation?: FieldConfirmation | null
}) {
  if (!value) return null
  return (
    <div className={span2 ? 'sm:col-span-2' : ''}>
      <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
        <span className="text-xs text-zinc-400">{label}</span>
        <span className={`text-[9px] font-medium border rounded px-1 py-px ${SOURCE_STYLE[source]}`}>
          {SOURCE_LABEL[source]}
        </span>
        <ConfirmedBadge confirmation={confirmation} />
      </div>
      <p className="text-sm text-zinc-800">{value}</p>
    </div>
  )
}

function HotField({ label, value, confirmation }: {
  label: string
  value: string
  confirmation?: FieldConfirmation | null
}) {
  return (
    <div className="rounded-lg bg-zinc-50 border border-zinc-200 px-3 py-2.5">
      <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-sm font-medium ${value ? 'text-zinc-800' : 'text-zinc-300'}`}>
        {value || '—'}
      </p>
      {confirmation && (
        <ConfirmedBadge confirmation={confirmation} />
      )}
    </div>
  )
}
