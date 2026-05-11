import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PrintTrigger } from '@/components/shared/PrintTrigger'
import type { TechRiderSection, PacketSection, FieldConfirmation, ShowNote } from '@/lib/types'

interface Props {
  params: Promise<{ tourId: string; showId: string }>
  searchParams: Promise<{ notes?: string }>
}

type SectionMap = Map<string, Record<string, string | number | boolean | null>>

function buildMap(sections: TechRiderSection[] | PacketSection[]): SectionMap {
  return new Map(sections.map(s => [s.section_key, s.fields]))
}

function v(map: SectionMap, section: string, field: string): string {
  const val = map.get(section)?.[field]
  if (val == null || val === '') return ''
  if (typeof val === 'boolean') return val ? 'Yes' : 'No'
  return String(val)
}

function f(fields: Record<string, string | null>, key: string): string {
  return fields[key] ?? ''
}

function ConfirmedLine({ confirmation }: { confirmation?: FieldConfirmation | null }) {
  if (!confirmation) return null
  const date = new Date(confirmation.confirmedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return (
    <p className="text-[7.5px] text-emerald-600 mt-0.5 leading-tight">
      ✓ {date} · {confirmation.confirmedBy} · {confirmation.method}
      {confirmation.note && ` · "${confirmation.note}"`}
    </p>
  )
}

function Field({ label, value, cols, confirmation }: {
  label: string; value: string; cols?: number; confirmation?: FieldConfirmation | null
}) {
  if (!value) return null
  const isLong = value.includes('\n') || value.length > 60
  const colSpan = cols === 4 ? 'col-span-4' : cols === 3 ? 'col-span-3' : cols === 2 || isLong ? 'col-span-2' : ''
  return (
    <div className={colSpan}>
      <p className="text-[8px] font-bold uppercase tracking-wider text-zinc-400 mb-0.5">{label}</p>
      <p className="text-[11px] text-zinc-800 whitespace-pre-wrap leading-snug">{value}</p>
      <ConfirmedLine confirmation={confirmation} />
    </div>
  )
}

function ContactRow({ label, value, confirmation }: {
  label: string; value: string; confirmation?: FieldConfirmation | null
}) {
  if (!value) return null
  return (
    <div className="flex gap-3">
      <span className="text-[8px] font-bold uppercase tracking-wide text-zinc-400 w-28 shrink-0 pt-px leading-tight">{label}</span>
      <div>
        <span className="text-[11px] text-zinc-800">{value}</span>
        <ConfirmedLine confirmation={confirmation} />
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="break-inside-avoid mb-5">
      <h2 className="text-[8px] font-bold uppercase tracking-widest text-zinc-400 border-b border-zinc-200 pb-1 mb-2.5">
        {title}
      </h2>
      {children}
    </div>
  )
}

function SubHeading({ label }: { label: string }) {
  return (
    <p className="col-span-4 text-[8px] font-bold uppercase tracking-wide text-zinc-500 mt-2 mb-0.5 border-t border-zinc-100 pt-2">
      {label}
    </p>
  )
}

export default async function AdvancePrintPage({ params, searchParams }: Props) {
  const { tourId, showId } = await params
  const { notes: includeNotes } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: tour } = await supabase
    .from('tours')
    .select('id, tour_name, artist_name')
    .eq('id', tourId)
    .eq('profile_id', user.id)
    .single()
  if (!tour) notFound()

  const { data: show } = await supabase
    .from('shows')
    .select('*, venues(id, name, address, city, state, capacity)')
    .eq('id', showId)
    .eq('tour_id', tourId)
    .single()
  if (!show) notFound()

  const venue = (Array.isArray(show.venues) ? show.venues[0] : show.venues) as {
    id: string; name: string; address: string | null
    city: string | null; state: string | null; capacity: number | null
  } | null

  const { data: advance } = await supabase
    .from('show_advances')
    .select('*')
    .eq('show_id', showId)
    .single()
  if (!advance) notFound()

  const fields = advance.fields as Record<string, string | null>
  const confirmations = (advance.field_confirmations ?? {}) as Record<string, FieldConfirmation>

  const riderSections: TechRiderSection[] = []
  const { data: riderData } = await supabase
    .from('tech_riders')
    .select('id')
    .eq('tour_id', tourId)
    .single()
  if (riderData) {
    const { data } = await supabase
      .from('tech_rider_sections')
      .select('*')
      .eq('rider_id', riderData.id)
    if (data) riderSections.push(...data)
  }

  const packetSections: PacketSection[] = []
  if (show.venue_id) {
    const { data: req } = await supabase
      .from('share_requests')
      .select('id')
      .eq('venue_id', show.venue_id)
      .eq('requester_profile_id', user.id)
      .eq('status', 'approved')
      .limit(1)
      .maybeSingle()
    if (req) {
      const { data: packet } = await supabase
        .from('technical_packets')
        .select('id')
        .eq('venue_id', show.venue_id)
        .single()
      if (packet) {
        const { data } = await supabase
          .from('packet_sections')
          .select('*')
          .eq('packet_id', packet.id)
        if (data) packetSections.push(...data)
      }
    }
  }

  const rider = buildMap(riderSections)
  const packet = buildMap(packetSections)

  const formattedDate = new Date(show.event_date + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  })
  const generatedDate = new Date().toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  })
  const venueLine = [venue?.address, venue?.city, venue?.state].filter(Boolean).join(', ')

  const hotPoints = [
    { label: 'Stage Dims',   value: v(packet, 'stage', 'full_deck'),          key: 'stage.full_deck' },
    { label: 'Wing SL',      value: v(packet, 'stage', 'wing_sl'),            key: 'stage.wing_sl' },
    { label: 'Wing SR',      value: v(packet, 'stage', 'wing_sr'),            key: 'stage.wing_sr' },
    { label: 'Trim Height',  value: v(packet, 'stage', 'trim_height'),        key: 'stage.trim_height' },
    { label: 'Docks',        value: v(packet, 'load_in', 'dock_bays'),        key: 'load_in.dock_bays' },
    { label: 'Dock Height',  value: v(packet, 'load_in', 'dock_height'),      key: 'load_in.dock_height' },
    { label: 'SPL Limit',    value: v(packet, 'audio', 'decibel_limit'),      key: 'audio.decibel_limit' },
    { label: 'Hard Curfew',  value: v(packet, 'schedule', 'hard_curfew'),     key: 'schedule.hard_curfew' },
    { label: 'Crew Access',  value: v(packet, 'schedule', 'crew_access'),     key: 'schedule.crew_access' },
    { label: 'Internet',     value: v(packet, 'hospitality', 'wifi_notes'),   key: 'hospitality.wifi_notes' },
    { label: 'Union',        value: v(packet, 'crew', 'union_affiliation'),   key: 'crew.union_affiliation' },
    { label: 'Service Type', value: v(packet, 'power', 'service_type'),       key: 'power.service_type' },
  ].filter(hp => hp.value)

  return (
    <>
      <PrintTrigger />
      <div className="bg-white text-zinc-900 font-sans p-10 max-w-5xl mx-auto print:p-0 print:max-w-none">

        {/* Header */}
        <div className="border-b-2 border-zinc-900 pb-4 mb-6">
          <h1 className="text-3xl font-bold tracking-tight">{tour.artist_name}</h1>
          <p className="text-lg text-zinc-600 mt-0.5">{tour.tour_name} — Advance Sheet</p>
          <div className="flex items-center gap-6 mt-2 text-xs text-zinc-400">
            <span>{formattedDate}</span>
            {venue && <span>{venue.name}</span>}
            <span>Generated {generatedDate}</span>
          </div>
        </div>

        {/* Hot Points */}
        {hotPoints.length > 0 && (
          <Section title="Hot Points">
            <div className="grid grid-cols-6 gap-x-4 gap-y-2">
              {hotPoints.map(hp => {
                const conf = confirmations[hp.key]
                return (
                  <div key={hp.label} className="rounded bg-zinc-50 border border-zinc-100 px-2 py-1.5">
                    <p className="text-[8px] font-bold uppercase tracking-wide text-zinc-400 mb-0.5">{hp.label}</p>
                    <p className="text-[11px] font-semibold text-zinc-800">{hp.value}</p>
                    {conf && (
                      <p className="text-[7px] text-emerald-600 mt-0.5 leading-tight">
                        ✓ {new Date(conf.confirmedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · {conf.confirmedBy}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </Section>
        )}

        {/* Show */}
        <Section title="Show">
          <div className="grid grid-cols-4 gap-x-6 gap-y-2.5">
            <Field label="Date" value={formattedDate} cols={2} />
            <Field label="Venue" value={venue?.name ?? ''} cols={2} />
            <Field label="Address" value={venueLine} cols={2} />
            <Field label="Capacity" value={venue?.capacity ? venue.capacity.toLocaleString() : ''} />
            <Field label="Indoor / Outdoor" value={f(fields, 'indoor_outdoor')} confirmation={confirmations['indoor_outdoor']} />
            <Field label="Age Restrictions" value={f(fields, 'age_restrictions')} confirmation={confirmations['age_restrictions']} />
            <Field label="Time Zone" value={f(fields, 'time_zone')} confirmation={confirmations['time_zone']} />
            <Field label="Promoter / Rep" value={f(fields, 'promoter_rep')} confirmation={confirmations['promoter_rep']} />
            <Field label="Settlement Contact" value={f(fields, 'settlement_contact')} confirmation={confirmations['settlement_contact']} />
            <Field label="Deal Type" value={f(fields, 'deal_type')} confirmation={confirmations['deal_type']} />
            <Field label="Deal Notes" value={f(fields, 'deal_notes')} cols={4} confirmation={confirmations['deal_notes']} />
          </div>
        </Section>

        {/* Contacts */}
        <div className="grid grid-cols-2 gap-x-10 mb-5 break-inside-avoid">
          <Section title="Venue Team">
            <div className="space-y-1.5">
              <ContactRow label="Production Manager"    value={v(packet, 'contacts', 'production_manager')} confirmation={confirmations['contacts.production_manager']} />
              <ContactRow label="General Manager"       value={v(packet, 'contacts', 'general_manager')} confirmation={confirmations['contacts.general_manager']} />
              <ContactRow label="Advance Contact"       value={v(packet, 'contacts', 'advance_contact')} confirmation={confirmations['contacts.advance_contact']} />
              <ContactRow label="House Sound"           value={v(packet, 'contacts', 'house_sound_engineer')} confirmation={confirmations['contacts.house_sound_engineer']} />
              <ContactRow label="House LD"              value={v(packet, 'contacts', 'house_ld')} confirmation={confirmations['contacts.house_ld']} />
              <ContactRow label="Head Rigger"           value={v(packet, 'contacts', 'head_rigger')} confirmation={confirmations['contacts.head_rigger']} />
              <ContactRow label="Stage Manager"         value={v(packet, 'contacts', 'stage_manager')} confirmation={confirmations['contacts.stage_manager']} />
              <ContactRow label="Security"              value={v(packet, 'contacts', 'security_contact')} confirmation={confirmations['contacts.security_contact']} />
              <ContactRow label="Emergency / After Hours" value={v(packet, 'contacts', 'emergency_contact')} confirmation={confirmations['contacts.emergency_contact']} />
              <ContactRow label="Box Office"            value={v(packet, 'contacts', 'box_office')} confirmation={confirmations['contacts.box_office']} />
              <ContactRow label="Merch Contact"         value={v(packet, 'contacts', 'vip_merch_contact')} />
            </div>
          </Section>
          <Section title="Tour Contacts">
            <div className="space-y-1.5">
              <ContactRow label="Tour Manager"          value={v(rider, 'tour_info', 'tour_manager')} />
              <ContactRow label="Production Manager"    value={v(rider, 'tour_info', 'production_manager')} />
              <ContactRow label="Production Assistant"  value={v(rider, 'tour_info', 'production_assistant')} />
              <ContactRow label="Tour Merch"            value={v(rider, 'tour_info', 'merch')} />
              <ContactRow label="Lead Driver"           value={v(rider, 'tour_info', 'lead_driver')} />
            </div>
          </Section>
        </div>

        {/* Schedule */}
        <Section title="Schedule">
          <div className="grid grid-cols-4 gap-x-6 gap-y-2.5">
            <Field label="Earliest Crew Access"  value={v(packet, 'schedule', 'crew_access')} confirmation={confirmations['schedule.crew_access']} />
            <Field label="Load-In Window"        value={v(packet, 'schedule', 'load_in_window')} confirmation={confirmations['schedule.load_in_window']} />
            <Field label="Soundcheck Window"     value={v(packet, 'schedule', 'soundcheck_window')} confirmation={confirmations['schedule.soundcheck_window']} />
            <Field label="Doors (Venue)"         value={v(packet, 'schedule', 'doors_open')} confirmation={confirmations['schedule.doors_open']} />
            <Field label="Hard Curfew"           value={v(packet, 'schedule', 'hard_curfew')} confirmation={confirmations['schedule.hard_curfew']} />
            <Field label="Load-Out Window"       value={v(packet, 'schedule', 'load_out_window')} confirmation={confirmations['schedule.load_out_window']} />
            <Field label="Curfew Enforcement"    value={f(fields, 'curfew_enforcement')} cols={2} confirmation={confirmations['curfew_enforcement']} />
            <SubHeading label="Show Times" />
            <Field label="Load-In Call"    value={f(fields, 'load_in_call')} confirmation={confirmations['load_in_call']} />
            <Field label="Doors"           value={f(fields, 'doors_time')} confirmation={confirmations['doors_time']} />
            <Field label="Show Start"      value={f(fields, 'show_start_time')} confirmation={confirmations['show_start_time']} />
            <Field label="Show Curfew"     value={f(fields, 'curfew_time')} confirmation={confirmations['curfew_time']} />
            <Field label="Set 1"           value={f(fields, 'set1_duration')} confirmation={confirmations['set1_duration']} />
            <Field label="Set Break"       value={f(fields, 'set_break')} confirmation={confirmations['set_break']} />
            <Field label="Set 2"           value={f(fields, 'set2_duration')} confirmation={confirmations['set2_duration']} />
            <Field label="Encore"          value={f(fields, 'encore_duration')} confirmation={confirmations['encore_duration']} />
            {(f(fields, 'day2_venue_access') || f(fields, 'day2_crew_call') || f(fields, 'day2_show_start') || f(fields, 'day2_load_out') || f(fields, 'multiday_notes')) && (
              <SubHeading label="Day 2 / Multi-Day" />
            )}
            <Field label="Day 2 Venue Access" value={f(fields, 'day2_venue_access')} />
            <Field label="Day 2 Crew Call"    value={f(fields, 'day2_crew_call')} />
            <Field label="Day 2 Show Start"   value={f(fields, 'day2_show_start')} />
            <Field label="Day 2 Load Out"     value={f(fields, 'day2_load_out')} />
            <Field label="Multi-Day Notes"    value={f(fields, 'multiday_notes')} cols={4} />
          </div>
        </Section>

        {/* Movement */}
        <Section title="Movement">
          <div className="grid grid-cols-4 gap-x-6 gap-y-2.5">
            <Field label="Buses"               value={v(rider, 'tour_info', 'bus_count')} />
            <Field label="Trucks"              value={v(rider, 'tour_info', 'truck_count')} />
            <Field label="Coming From"         value={f(fields, 'coming_from')} confirmation={confirmations['coming_from']} />
            <Field label="Next City / Venue"   value={f(fields, 'next_city')} confirmation={confirmations['next_city']} />
            <Field label="Est. Arrival"        value={f(fields, 'estimated_arrival')} confirmation={confirmations['estimated_arrival']} />
            <Field label="Est. Departure"      value={f(fields, 'estimated_departure')} confirmation={confirmations['estimated_departure']} />
            <Field label="Arrival Notes"       value={f(fields, 'arrival_notes')} cols={4} confirmation={confirmations['arrival_notes']} />
          </div>
        </Section>

        {/* Audio */}
        <Section title="Audio">
          <div className="grid grid-cols-4 gap-x-6 gap-y-2.5">
            <Field label="Main Hang"            value={v(rider, 'audio', 'main_hang')} />
            <Field label="Sub"                  value={v(rider, 'audio', 'sub')} />
            <Field label="Side / Front Fills"   value={v(rider, 'audio', 'side_front_fills')} />
            <Field label="FOH Console"          value={v(rider, 'audio', 'foh_console')} />
            <Field label="Monitor Console"      value={v(rider, 'audio', 'monitor_console')} />
            <Field label="Channels Required"    value={v(rider, 'audio', 'required_channel_count')} />
            <Field label="Monitor Mixes"        value={v(rider, 'audio', 'required_monitor_mixes')} />
            <Field label="House Consoles Out"   value={v(rider, 'audio', 'house_consoles_removed')} />
            <Field label="SPL Limit"            value={v(packet, 'audio', 'decibel_limit')} confirmation={confirmations['audio.decibel_limit']} />
            <Field label="Venue Console I/O"    value={v(packet, 'audio', 'console_io_format')} confirmation={confirmations['audio.console_io_format']} />
            <Field label="Tie-In Possible"      value={v(packet, 'audio', 'touring_console_tie_in')} confirmation={confirmations['audio.touring_console_tie_in']} />
            <SubHeading label="FOH Position" />
            <Field label="DSE to FOH"                    value={v(packet, 'stage', 'foh_distance')} />
            <Field label="FOH Depth"                     value={v(packet, 'stage', 'foh_depth')} />
            <Field label="Snake Run"                     value={v(packet, 'stage', 'snake_run')} />
            <Field label="FOH Covering / Retractable"    value={f(fields, 'foh_covering')} />
            <Field label="Lighting Riser Needed"         value={f(fields, 'lighting_riser')} />
            <Field label="Camera Riser Needed"           value={f(fields, 'camera_riser')} />
          </div>
        </Section>

        {/* Lighting */}
        <Section title="Lighting">
          <div className="grid grid-cols-4 gap-x-6 gap-y-2.5">
            <Field label="House Rig Struck"   value={v(rider, 'lighting', 'house_rig_struck')} />
            <Field label="CO₂ Request"        value={v(rider, 'lighting', 'co2_request')} />
            <Field label="Tour LD"            value={v(rider, 'lighting', 'tour_ld')} />
            <Field label="Haze Notes"         value={v(rider, 'lighting', 'haze_notes')} cols={2} />
            <Field label="Venue Haze Policy"  value={v(packet, 'lighting', 'haze_fog')} confirmation={confirmations['lighting.haze_fog']} />
            <Field label="Venue Console"      value={v(packet, 'lighting', 'console')} confirmation={confirmations['lighting.console']} />
            <Field label="Guest Console OK"   value={v(packet, 'lighting', 'guest_console')} confirmation={confirmations['lighting.guest_console']} />
            <Field label="Follow Spots"       value={v(packet, 'lighting', 'follow_spots')} confirmation={confirmations['lighting.follow_spots']} />
          </div>
        </Section>

        {/* Stage & Rigging */}
        <Section title="Stage & Rigging">
          <div className="grid grid-cols-4 gap-x-6 gap-y-2.5">
            <Field label="Full Deck (W×D×H)"      value={v(packet, 'stage', 'full_deck')} confirmation={confirmations['stage.full_deck']} />
            <Field label="Performance Area"        value={v(packet, 'stage', 'performance_area')} confirmation={confirmations['stage.performance_area']} />
            <Field label="Stage Height"            value={v(packet, 'stage', 'stage_height')} confirmation={confirmations['stage.stage_height']} />
            <Field label="Stage Surface"           value={v(packet, 'stage', 'surface_type')} confirmation={confirmations['stage.surface_type']} />
            <Field label="Deck Load Capacity"      value={v(packet, 'stage', 'deck_load')} confirmation={confirmations['stage.deck_load']} />
            <Field label="Wing SL"                 value={v(packet, 'stage', 'wing_sl')} confirmation={confirmations['stage.wing_sl']} />
            <Field label="Wing SR"                 value={v(packet, 'stage', 'wing_sr')} confirmation={confirmations['stage.wing_sr']} />
            <Field label="Trim / Grid Height"      value={v(packet, 'stage', 'trim_height')} confirmation={confirmations['stage.trim_height']} />
            <Field label="Fly System"              value={v(packet, 'stage', 'fly_system')} confirmation={confirmations['stage.fly_system']} />
            <Field label="Line Sets"               value={v(packet, 'stage', 'line_sets')} confirmation={confirmations['stage.line_sets']} />
            <Field label="Per-Batten Capacity"     value={v(packet, 'stage', 'batten_capacity')} confirmation={confirmations['stage.batten_capacity']} />
            <Field label="Motor Points / Capacity" value={v(packet, 'stage', 'rigging_points')} confirmation={confirmations['stage.rigging_points']} />
            <Field label="Rigging Inspection"      value={v(packet, 'stage', 'rigging_inspection')} confirmation={confirmations['stage.rigging_inspection']} />
            <Field label="Venue Risers"            value={v(packet, 'stage', 'risers')} confirmation={confirmations['stage.risers']} />
            <Field label="Min Stage Width Req."    value={v(rider, 'stage_requirements', 'min_stage_width')} />
            <Field label="Min Stage Depth Req."    value={v(rider, 'stage_requirements', 'min_stage_depth')} />
            <Field label="Risers Needed"           value={v(rider, 'stage_requirements', 'risers_needed')} />
            <Field label="Upstage Black Required"  value={v(rider, 'stage_requirements', 'upstage_black')} />
            <Field label="Dead Storage Needs"      value={v(rider, 'stage_requirements', 'dead_storage_needs')} />
            <Field label="Dead Case Storage"       value={v(packet, 'load_in', 'dead_case_storage')} />
            <Field label="Barricade Distance"      value={v(rider, 'stage_requirements', 'barricade_distance')} />
            <Field label="Barricade Type"          value={v(rider, 'stage_requirements', 'barricade_type')} />
            <Field label="Production in Pit"       value={v(rider, 'stage_requirements', 'production_in_pit')} />
            <Field label="Barricade Breaks"        value={f(fields, 'barricade_breaks')} />
            <Field label="Wings / Screens"         value={f(fields, 'wings_screens')} />
            <Field label="Tech Curtain / Pipe & Drape" value={f(fields, 'tech_curtain')} cols={2} />
            <Field label="Load-In Access"          value={v(packet, 'load_in', 'load_in_access')} />
            <Field label="Freight Elevator"        value={v(packet, 'load_in', 'freight_elevator')} />
            <Field label="Stage Clearance"         value={v(packet, 'load_in', 'stage_clearance')} />
          </div>
        </Section>

        {/* Power */}
        <Section title="Power">
          <div className="grid grid-cols-4 gap-x-6 gap-y-2.5">
            <Field label="Venue Service Type"      value={v(packet, 'power', 'service_type')} confirmation={confirmations['power.service_type']} />
            <Field label="Voltage"                 value={v(packet, 'power', 'voltage')} confirmation={confirmations['power.voltage']} />
            <Field label="Total Service"           value={v(packet, 'power', 'total_service')} confirmation={confirmations['power.total_service']} />
            <Field label="Avail. to Production"    value={v(packet, 'power', 'available_to_production')} confirmation={confirmations['power.available_to_production']} />
            <Field label="Panel Locations"         value={v(packet, 'power', 'power_location')} confirmation={confirmations['power.power_location']} />
            <Field label="Distro / Connector Type" value={v(packet, 'power', 'distro_type')} confirmation={confirmations['power.distro_type']} />
            <Field label="LX / Rigging Req."       value={v(rider, 'power', 'lx_rigging_power')} />
            <Field label="LX Location"             value={v(rider, 'power', 'lx_rigging_location')} />
            <Field label="Audio Req."              value={v(rider, 'power', 'audio_power')} />
            <Field label="Audio Location"          value={v(rider, 'power', 'audio_location')} />
            <Field label="Video Req."              value={v(rider, 'power', 'video_power')} />
            <Field label="Video Location"          value={v(rider, 'power', 'video_location')} />
            <Field label="Extra Feeder Req."       value={v(rider, 'power', 'extra_feeder')} />
            <Field label="Known Issues"            value={v(packet, 'power', 'power_known_issues')} cols={4} />
          </div>
        </Section>

        {/* Labor */}
        <Section title="Labor">
          <div className="grid grid-cols-4 gap-x-6 gap-y-2.5">
            <SubHeading label="Load In" />
            <Field label="Crew Chief"    value={v(rider, 'labor_defaults', 'crew_chief')} />
            <Field label="Electrician"   value={v(rider, 'labor_defaults', 'electrician')} />
            <Field label="Head Rigger"   value={v(rider, 'labor_defaults', 'head_rigger')} />
            <Field label="Up Riggers"    value={v(rider, 'labor_defaults', 'up_riggers')} />
            <Field label="Down Riggers"  value={v(rider, 'labor_defaults', 'down_riggers')} />
            <Field label="Loaders"       value={v(rider, 'labor_defaults', 'loaders')} />
            <Field label="Forklift"      value={v(rider, 'labor_defaults', 'forklift')} />
            <Field label="1st Call"      value={[v(rider, 'labor_defaults', 'first_call_total'), v(rider, 'labor_defaults', 'first_call_breakdown')].filter(Boolean).join(' — ')} />
            <Field label="2nd Call"      value={v(rider, 'labor_defaults', 'second_call_breakdown')} />
            <SubHeading label="Show Call" />
            <Field label="Venue Union"    value={v(packet, 'crew', 'union_affiliation')} confirmation={confirmations['crew.union_affiliation']} />
            <Field label="Mandatory Crew" value={v(packet, 'crew', 'mandatory_crew')} confirmation={confirmations['crew.mandatory_crew']} />
            <Field label="Min Stagehands" value={v(packet, 'crew', 'min_stagehands')} confirmation={confirmations['crew.min_stagehands']} />
            <Field label="Available Crew" value={v(packet, 'crew', 'available_crew')} confirmation={confirmations['crew.available_crew']} />
            <Field label="House Lights Op" value={f(fields, 'show_house_lights')} />
            <Field label="House Audio Op"  value={f(fields, 'show_house_audio')} />
            <Field label="Stagehands"      value={f(fields, 'show_stagehands')} />
            <Field label="Camera Ops"      value={f(fields, 'show_camera_ops')} />
            <Field label="Cable Pager"     value={f(fields, 'show_cable_pager')} />
            <SubHeading label="Load Out" />
            <Field label="Load Out"          value={[v(rider, 'labor_defaults', 'load_out_total'), v(rider, 'labor_defaults', 'load_out_breakdown')].filter(Boolean).join(' — ')} />
            <Field label="Load Out Call Time" value={f(fields, 'load_out_call')} />
            <Field label="Min Call"           value={v(rider, 'labor_defaults', 'labor_min_call')} />
            <Field label="Feeding Rules"      value={v(rider, 'labor_defaults', 'feeding_rules')} />
            <Field label="Union Meal Break"   value={v(packet, 'crew', 'union_meal_break')} />
            <Field label="Labor Budget"       value={f(fields, 'labor_budget')} />
            <Field label="Catering Budget"    value={f(fields, 'catering_budget')} />
          </div>
        </Section>

        {/* Load-In & Parking */}
        <Section title="Load-In & Parking">
          <div className="grid grid-cols-4 gap-x-6 gap-y-2.5">
            <Field label="Dock Height"       value={v(packet, 'load_in', 'dock_height')} confirmation={confirmations['load_in.dock_height']} />
            <Field label="Dock Door Dims"    value={v(packet, 'load_in', 'dock_door_dimensions')} confirmation={confirmations['load_in.dock_door_dimensions']} />
            <Field label="Loading Bays"      value={v(packet, 'load_in', 'dock_bays')} confirmation={confirmations['load_in.dock_bays']} />
            <Field label="Dock Leveler"      value={v(packet, 'load_in', 'dock_leveler')} confirmation={confirmations['load_in.dock_leveler']} />
            <Field label="Dock Access Hours" value={v(packet, 'load_in', 'dock_access_hours')} confirmation={confirmations['load_in.dock_access_hours']} />
            <Field label="Forklift"          value={v(packet, 'load_in', 'forklift')} confirmation={confirmations['load_in.forklift']} />
            <Field label="Pallet Jack"       value={v(packet, 'load_in', 'pallet_jack')} confirmation={confirmations['load_in.pallet_jack']} />
            <Field label="Truck Parking"     value={v(packet, 'load_in', 'truck_parking')} confirmation={confirmations['load_in.truck_parking']} />
            <Field label="Bus Parking"       value={v(packet, 'load_in', 'bus_parking')} confirmation={confirmations['load_in.bus_parking']} />
            <Field label="Crew Parking"      value={v(packet, 'load_in', 'crew_parking')} confirmation={confirmations['load_in.crew_parking']} />
            <Field label="Overnight Parking" value={v(packet, 'load_in', 'overnight_parking')} confirmation={confirmations['load_in.overnight_parking']} />
            <Field label="Shore Power"       value={v(packet, 'load_in', 'shore_power_parking')} confirmation={confirmations['load_in.shore_power_parking']} />
          </div>
        </Section>

        {/* Hospitality */}
        <Section title="Hospitality">
          <div className="grid grid-cols-4 gap-x-6 gap-y-2.5">
            <Field label="Dressing Rooms"    value={v(packet, 'hospitality', 'dressing_rooms')} confirmation={confirmations['hospitality.dressing_rooms']} />
            <Field label="Showers"           value={v(packet, 'hospitality', 'shower_count')} confirmation={confirmations['hospitality.shower_count']} />
            <Field label="Laundry"           value={v(packet, 'hospitality', 'laundry')} confirmation={confirmations['hospitality.laundry']} />
            <Field label="Ice Machine"       value={v(packet, 'hospitality', 'ice_machine')} confirmation={confirmations['hospitality.ice_machine']} />
            <Field label="Production Office" value={v(packet, 'hospitality', 'production_office_location')} confirmation={confirmations['hospitality.production_office_location']} />
            <Field label="Catering Room"     value={v(packet, 'hospitality', 'catering_room')} confirmation={confirmations['hospitality.catering_room']} />
            <Field label="Venue Catering"    value={v(packet, 'hospitality', 'venue_catering')} confirmation={confirmations['hospitality.venue_catering']} />
            <Field label="Venue WiFi"        value={v(packet, 'hospitality', 'wifi_notes')} confirmation={confirmations['hospitality.wifi_notes']} />
            <Field label="Bath Towels Req."  value={v(rider, 'hospitality', 'bath_towels')} />
            <Field label="Stage Towels Req." value={v(rider, 'hospitality', 'stage_towels')} />
            <Field label="Tabling Needs"     value={v(rider, 'hospitality', 'tabling_needs')} />
            <Field label="After-Show Cash"   value={v(rider, 'hospitality', 'aftershow_cash')} />
            <Field label="Catering Rider"    value={v(rider, 'hospitality', 'catering_rider')} cols={4} />
            <Field label="Kitchen on Site"   value={f(fields, 'kitchen_on_site')} />
            <Field label="Fridges in Rooms"  value={f(fields, 'fridges_in_rooms')} />
            <Field label="Warmer Available"  value={f(fields, 'warmer_available')} />
            <Field label="Hard Line in PO"   value={f(fields, 'hard_line_drop_po')} />
          </div>
        </Section>

        {/* Merch */}
        <Section title="Merch">
          <div className="grid grid-cols-4 gap-x-6 gap-y-2.5">
            <Field label="Venue Merch Contact"  value={v(packet, 'contacts', 'vip_merch_contact')} />
            <Field label="Venue Merch Info"     value={v(packet, 'hospitality', 'merchandise')} />
            <Field label="Who Sells"            value={f(fields, 'merch_who_sells')} />
            <Field label="Split"                value={f(fields, 'merch_split')} />
            <Field label="Local Merch Contact"  value={f(fields, 'merch_local_contact')} />
            <Field label="Contact Email"        value={f(fields, 'merch_contact_email')} />
            <Field label="Shipping Address"     value={f(fields, 'merch_shipping_address')} cols={4} />
            <Field label="Push Details"         value={f(fields, 'merch_push_details')} cols={4} />
            <Field label="Merch Notes"          value={f(fields, 'merch_notes')} cols={4} />
          </div>
        </Section>

        {/* Runner */}
        <Section title="Runner">
          <div className="grid grid-cols-4 gap-x-6 gap-y-2.5">
            <Field label="# Runners"           value={f(fields, 'runner_count')} />
            <Field label="Vehicle Type"        value={f(fields, 'runner_vehicle_type')} />
            <Field label="Can Drive Personnel" value={f(fields, 'runner_drive_personnel')} />
            <Field label="Runner Call Time"    value={f(fields, 'runner_call_time')} />
            <Field label="Runner Cut Time"     value={f(fields, 'runner_cut_time')} />
            <Field label="Restrictions"        value={f(fields, 'runner_restrictions')} />
            <Field label="Runner Notes"        value={f(fields, 'runner_notes')} cols={4} />
          </div>
        </Section>

        {/* Video */}
        <Section title="Video">
          <div className="grid grid-cols-4 gap-x-6 gap-y-2.5">
            <Field label="Streaming Platform"    value={v(rider, 'video', 'streaming_platform')} />
            <Field label="Internet Requirement"  value={v(rider, 'video', 'internet_requirement')} />
            <Field label="IMAG Screens"          value={v(packet, 'video', 'led_wall') || v(packet, 'video', 'projector_screen')} />
            <Field label="Video Input Types"     value={v(packet, 'video', 'video_inputs')} />
            <Field label="Venue Cameras"         value={v(packet, 'video', 'cameras')} />
            <Field label="Video Switcher"        value={v(packet, 'video', 'video_switcher')} />
            <Field label="Video World Location"  value={f(fields, 'video_world_location')} />
            <Field label="Broadcast Location"    value={f(fields, 'broadcast_location')} />
            <Field label="Ethernet Drop"         value={f(fields, 'ethernet_drop')} />
            <Field label="TVs to Tie In"         value={f(fields, 'tvs_to_tie')} />
            <Field label="Video Tie Location"    value={f(fields, 'video_tie_location')} />
            <Field label="Video Tie Notes"       value={f(fields, 'video_tie_notes')} cols={4} />
          </div>
        </Section>

        {/* Notes */}
        <Section title="Notes">
          <div className="grid grid-cols-4 gap-x-6 gap-y-2.5">
            <Field label="Standard Advance Note" value={v(rider, 'production_notes', 'standard_note')} cols={4} />
            <Field label="Show Notes"            value={f(fields, 'show_notes')} cols={4} />
            <Field label="Security Notes"        value={f(fields, 'security_notes')} cols={4} />
            <Field label="Additional Notes"      value={f(fields, 'additional_notes')} cols={4} />
          </div>
        </Section>

        {/* Internal Notes — only when ?notes=1 */}
        {includeNotes === '1' && (() => {
          const showNotes: ShowNote[] = Array.isArray(advance.show_notes) ? advance.show_notes : []
          if (showNotes.length === 0) return null
          const sorted = [...showNotes].sort((a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )
          return (
            <Section title="Internal Notes (PM Only)">
              <div className="space-y-2">
                {sorted.map(note => (
                  <div key={note.id} className="border-b border-zinc-100 pb-2 last:border-0">
                    <p className="text-[8px] text-zinc-400 mb-0.5">
                      {new Date(note.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      {' · '}{note.created_by_name}
                    </p>
                    <p className="text-[11px] text-zinc-800 whitespace-pre-wrap leading-snug">{note.body}</p>
                  </div>
                ))}
              </div>
            </Section>
          )
        })()}

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-zinc-200 text-[10px] text-zinc-400 flex justify-between">
          <span>{tour.artist_name} · {tour.tour_name}</span>
          <span>Advance Sheet · {generatedDate}</span>
        </div>
      </div>
    </>
  )
}
