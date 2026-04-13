'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Save } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TechRiderSection, PacketSection } from '@/lib/types'

// ── Data helpers ──────────────────────────────────────────────────────────────

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

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  showId: string
  advanceId: string
  initialFields: Record<string, string | null>
  tour: { artist_name: string; tour_name: string }
  show: { event_date: string }
  venue: { name: string; address: string | null; city: string | null; state: string | null; capacity: number | null } | null
  riderSections: TechRiderSection[]
  packetSections: PacketSection[]
  venuePacketApproved: boolean
}

// ── Component ─────────────────────────────────────────────────────────────────

export function AdvanceSheet({
  advanceId,
  initialFields,
  tour,
  show,
  venue,
  riderSections,
  packetSections,
  venuePacketApproved,
}: Props) {
  const router = useRouter()
  const [fields, setFields] = useState<Record<string, string>>(
    Object.fromEntries(
      Object.entries(initialFields).map(([k, v]) => [k, v ?? ''])
    )
  )
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)

  const rider = buildMap(riderSections)
  const packet = buildMap(packetSections)

  function set(key: string, value: string) {
    setFields(prev => ({ ...prev, [key]: value }))
    setDirty(true)
  }

  async function handleSave() {
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('show_advances')
      .update({ fields, updated_at: new Date().toISOString() })
      .eq('id', advanceId)
    if (error) { toast.error(error.message); setSaving(false); return }
    toast.success('Advance sheet saved')
    setSaving(false)
    setDirty(false)
    router.refresh()
  }

  const formattedDate = new Date(show.event_date + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  })

  return (
    <div className="space-y-6">

      {/* Save bar */}
      <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-3">
        <div className="flex items-center gap-4 flex-wrap">
          <p className="text-xs text-zinc-400">Sources:</p>
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-violet-600 bg-violet-50 border border-violet-100 rounded px-1.5 py-0.5">Tech Rider</span>
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-blue-600 bg-blue-50 border border-blue-100 rounded px-1.5 py-0.5">Venue Packet</span>
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-600 bg-amber-50 border border-amber-100 rounded px-1.5 py-0.5">Input List</span>
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-zinc-500 bg-zinc-50 border border-zinc-200 rounded px-1.5 py-0.5">Show</span>
        </div>
        <Button size="sm" onClick={handleSave} disabled={saving || !dirty}>
          <Save className="h-3.5 w-3.5 mr-1.5" />
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </div>

      {/* ── HOT POINTS ─────────────────────────────────────────────────── */}
      <Section title="Hot Points">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <HotPoint label="Stage Dims"     value={val(packet, 'stage', 'full_deck')} />
          <HotPoint label="Wing SL"        value={val(packet, 'stage', 'wing_sl')} />
          <HotPoint label="Wing SR"        value={val(packet, 'stage', 'wing_sr')} />
          <HotPoint label="Trim Height"    value={val(packet, 'stage', 'trim_height')} />
          <HotPoint label="Docks"          value={val(packet, 'load_in', 'dock_bays')} />
          <HotPoint label="Dock Height"    value={val(packet, 'load_in', 'dock_height')} />
          <HotPoint label="SPL Limit"      value={val(packet, 'audio', 'decibel_limit')} />
          <HotPoint label="Hard Curfew"    value={val(packet, 'schedule', 'hard_curfew')} />
          <HotPoint label="Crew Access"    value={val(packet, 'schedule', 'crew_access')} />
          <HotPoint label="Internet"       value={val(packet, 'hospitality', 'wifi_notes')} />
          <HotPoint label="Union"          value={val(packet, 'crew', 'union_affiliation')} />
          <HotPoint label="Service Type"   value={val(packet, 'power', 'service_type')} />
        </div>
      </Section>

      {/* ── SHOW INFO ──────────────────────────────────────────────────── */}
      <Section title="Show">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
          <AutoField label="Date"     value={formattedDate}                                                          source="show" />
          <AutoField label="Venue"    value={venue?.name ?? ''}                                                       source="show" />
          <AutoField label="Address"  value={[venue?.address, venue?.city, venue?.state].filter(Boolean).join(', ')} source="show" />
          <AutoField label="Capacity" value={venue?.capacity ? venue.capacity.toLocaleString() : ''}                 source="show" />
          <EditField label="Promoter / Rep"      fieldKey="promoter_rep"       fields={fields} set={set} />
          <EditField label="Settlement Contact"  fieldKey="settlement_contact"  fields={fields} set={set} />
          <EditField label="Deal Type"           fieldKey="deal_type"           fields={fields} set={set} />
          <EditField label="Deal Notes"          fieldKey="deal_notes"          fields={fields} set={set} multiline />
        </div>
      </Section>

      {/* ── MOVEMENT ──────────────────────────────────────────────────── */}
      <Section title="Movement">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
          <AutoField label="Buses"   value={val(rider, 'tour_info', 'bus_count')}   source="rider" />
          <AutoField label="Trucks"  value={val(rider, 'tour_info', 'truck_count')} source="rider" />
          <EditField label="Coming From"          fieldKey="coming_from"         fields={fields} set={set} />
          <EditField label="Estimated Arrival"    fieldKey="estimated_arrival"   fields={fields} set={set} placeholder="e.g. 8:00 AM" />
          <EditField label="Estimated Departure"  fieldKey="estimated_departure" fields={fields} set={set} placeholder="e.g. 2:00 AM" />
          <EditField label="Next City / Venue"    fieldKey="next_city"           fields={fields} set={set} />
          <EditField label="Arrival Notes"        fieldKey="arrival_notes"       fields={fields} set={set} multiline span2 />
        </div>
      </Section>

      {/* ── CONTACTS ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Section title="Venue Team">
          <div className="space-y-3">
            <ContactField label="Production Manager"      value={val(packet, 'contacts', 'production_manager')}    source="packet" />
            <ContactField label="General Manager"         value={val(packet, 'contacts', 'general_manager')}       source="packet" />
            <ContactField label="Advance Contact"         value={val(packet, 'contacts', 'advance_contact')}       source="packet" />
            <ContactField label="House Sound"             value={val(packet, 'contacts', 'house_sound_engineer')}  source="packet" />
            <ContactField label="House LD"                value={val(packet, 'contacts', 'house_ld')}              source="packet" />
            <ContactField label="Head Rigger"             value={val(packet, 'contacts', 'head_rigger')}           source="packet" />
            <ContactField label="Stage Manager"           value={val(packet, 'contacts', 'stage_manager')}         source="packet" />
            <ContactField label="Emergency / After Hours" value={val(packet, 'contacts', 'emergency_contact')}     source="packet" />
          </div>
        </Section>

        <Section title="Tour Contacts">
          <div className="space-y-3">
            <ContactField label="Tour Manager"          value={val(rider, 'tour_info', 'tour_manager')}          source="rider" />
            <ContactField label="Production Manager"    value={val(rider, 'tour_info', 'production_manager')}    source="rider" />
            <ContactField label="Production Assistant"  value={val(rider, 'tour_info', 'production_assistant')}  source="rider" />
            <ContactField label="Tour Merch"            value={val(rider, 'tour_info', 'merch')}                 source="rider" />
            <ContactField label="Lead Driver"           value={val(rider, 'tour_info', 'lead_driver')}           source="rider" />
          </div>
        </Section>
      </div>

      {/* ── SCHEDULE ──────────────────────────────────────────────────── */}
      <Section title="Schedule">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
          <AutoField label="Earliest Crew Access"  value={val(packet, 'schedule', 'crew_access')}       source="packet" />
          <AutoField label="Load-In Window"        value={val(packet, 'schedule', 'load_in_window')}    source="packet" />
          <AutoField label="Soundcheck Window"     value={val(packet, 'schedule', 'soundcheck_window')} source="packet" />
          <AutoField label="Doors (venue)"         value={val(packet, 'schedule', 'doors_open')}        source="packet" />
          <AutoField label="Hard Curfew"           value={val(packet, 'schedule', 'hard_curfew')}       source="packet" />
          <AutoField label="Load-Out Window"       value={val(packet, 'schedule', 'load_out_window')}   source="packet" />
          <div className="col-span-full border-t border-zinc-100 pt-4 mt-1">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-3">Show Times</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
              <EditField label="Load-In Call"   fieldKey="load_in_call"   fields={fields} set={set} placeholder="e.g. 9:00 AM" />
              <EditField label="Doors"          fieldKey="doors_time"     fields={fields} set={set} placeholder="e.g. 7:00 PM" />
              <EditField label="Show Start"     fieldKey="show_start_time" fields={fields} set={set} placeholder="e.g. 8:00 PM" />
              <EditField label="Set 1"          fieldKey="set1_duration"  fields={fields} set={set} placeholder="e.g. 75 min" />
              <EditField label="Set Break"      fieldKey="set_break"      fields={fields} set={set} placeholder="e.g. 30 min" />
              <EditField label="Set 2"          fieldKey="set2_duration"  fields={fields} set={set} placeholder="e.g. 75 min" />
              <EditField label="Encore"         fieldKey="encore_duration" fields={fields} set={set} placeholder="e.g. 20 min" />
              <EditField label="Show Curfew"    fieldKey="curfew_time"    fields={fields} set={set} placeholder="e.g. 11:00 PM" />
            </div>
          </div>
        </div>
      </Section>

      {/* ── PRODUCTION ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Section title="Audio">
          <div className="space-y-3">
            <AutoField label="Main Hang"          value={val(rider, 'audio', 'main_hang')}              source="rider" />
            <AutoField label="Sub"                value={val(rider, 'audio', 'sub')}                    source="rider" />
            <AutoField label="Side / Front Fills" value={val(rider, 'audio', 'side_front_fills')}       source="rider" />
            <AutoField label="FOH Console"        value={val(rider, 'audio', 'foh_console')}            source="rider" />
            <AutoField label="Monitor Console"    value={val(rider, 'audio', 'monitor_console')}        source="rider" />
            <AutoField label="Channels Required"  value={val(rider, 'audio', 'required_channel_count')} source="input-list" />
            <AutoField label="Monitor Mixes"      value={val(rider, 'audio', 'required_monitor_mixes')} source="input-list" />
            <AutoField label="House Consoles Out" value={val(rider, 'audio', 'house_consoles_removed')} source="rider" />
            <AutoField label="SPL Limit"          value={val(packet, 'audio', 'decibel_limit')}         source="packet" />
            <AutoField label="Venue Console I/O"  value={val(packet, 'audio', 'console_io_format')}     source="packet" />
          </div>
        </Section>

        <Section title="Lighting">
          <div className="space-y-3">
            <AutoField label="House Rig Struck"  value={val(rider, 'lighting', 'house_rig_struck')} source="rider" />
            <AutoField label="CO₂ Request"       value={val(rider, 'lighting', 'co2_request')}      source="rider" />
            <AutoField label="Tour LD"           value={val(rider, 'lighting', 'tour_ld')}           source="rider" />
            <AutoField label="Haze Notes"        value={val(rider, 'lighting', 'haze_notes')}        source="rider" />
            <AutoField label="Venue Haze Policy" value={val(packet, 'lighting', 'haze_fog')}         source="packet" />
          </div>
        </Section>
      </div>

      {/* ── POWER ─────────────────────────────────────────────────────── */}
      <Section title="Power">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-3">
          <AutoField label="Rigging / LX Required"   value={val(rider, 'power', 'lx_rigging_power')}          source="rider" />
          <AutoField label="Rigging / LX Location"   value={val(rider, 'power', 'lx_rigging_location')}       source="rider" />
          <AutoField label="Audio Required"          value={val(rider, 'power', 'audio_power')}               source="rider" />
          <AutoField label="Audio Location"          value={val(rider, 'power', 'audio_location')}            source="rider" />
          <AutoField label="Video Required"          value={val(rider, 'power', 'video_power')}               source="rider" />
          <AutoField label="Video Location"          value={val(rider, 'power', 'video_location')}            source="rider" />
          <AutoField label="Venue Service Type"      value={val(packet, 'power', 'service_type')}             source="packet" />
          <AutoField label="Available to Production" value={val(packet, 'power', 'available_to_production')}  source="packet" />
          <AutoField label="Panel Locations"         value={val(packet, 'power', 'power_location')}           source="packet" />
          <AutoField label="Known Issues"            value={val(packet, 'power', 'power_known_issues')}       source="packet" />
        </div>
      </Section>

      {/* ── LABOR ─────────────────────────────────────────────────────── */}
      <Section title="Labor">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
          <AutoField label="Crew Chief"    value={val(rider, 'labor_defaults', 'crew_chief')}                                                                               source="rider" />
          <AutoField label="Electrician"  value={val(rider, 'labor_defaults', 'electrician')}                                                                            source="rider" />
          <AutoField label="Head Rigger"  value={val(rider, 'labor_defaults', 'head_rigger')}                                                                            source="rider" />
          <AutoField label="Up Riggers"   value={val(rider, 'labor_defaults', 'up_riggers')}                                                                             source="rider" />
          <AutoField label="Down Riggers" value={val(rider, 'labor_defaults', 'down_riggers')}                                                                           source="rider" />
          <AutoField label="Loaders"      value={val(rider, 'labor_defaults', 'loaders')}                                                                                source="rider" />
          <AutoField label="Forklift"     value={val(rider, 'labor_defaults', 'forklift')}                                                                               source="rider" />
          <AutoField label="1st Call"     value={[val(rider, 'labor_defaults', 'first_call_total'), val(rider, 'labor_defaults', 'first_call_breakdown')].filter(Boolean).join(' — ')} source="rider" />
          <AutoField label="2nd Call"     value={val(rider, 'labor_defaults', 'second_call_breakdown')}                                                                  source="rider" />
          <AutoField label="Load Out"     value={[val(rider, 'labor_defaults', 'load_out_total'), val(rider, 'labor_defaults', 'load_out_breakdown')].filter(Boolean).join(' — ')}     source="rider" />
          <AutoField label="Min Call"     value={val(rider, 'labor_defaults', 'labor_min_call')}                                                                         source="rider" />
          <AutoField label="Feeding Rules" value={val(rider, 'labor_defaults', 'feeding_rules')}                                                                        source="rider" />
          <AutoField label="Venue Union"   value={val(packet, 'crew', 'union_affiliation')}                                                                              source="packet" />
          <AutoField label="Mandatory Crew" value={val(packet, 'crew', 'mandatory_crew')}                                                                               source="packet" />
          <EditField label="Labor Budget"   fieldKey="labor_budget"   fields={fields} set={set} placeholder="e.g. $15,000" />
          <EditField label="Catering Budget" fieldKey="catering_budget" fields={fields} set={set} placeholder="e.g. $7,500" />
        </div>
      </Section>

      {/* ── LOAD-IN & PARKING ─────────────────────────────────────────── */}
      <Section title="Load-In & Parking">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-3">
          <AutoField label="Dock Height"        value={val(packet, 'load_in', 'dock_height')}           source="packet" />
          <AutoField label="Dock Door Dims"     value={val(packet, 'load_in', 'dock_door_dimensions')}  source="packet" />
          <AutoField label="Loading Bays"       value={val(packet, 'load_in', 'dock_bays')}             source="packet" />
          <AutoField label="Dock Leveler"       value={val(packet, 'load_in', 'dock_leveler')}          source="packet" />
          <AutoField label="Forklift Available" value={val(packet, 'load_in', 'forklift')}              source="packet" />
          <AutoField label="Dock Access Hours"  value={val(packet, 'load_in', 'dock_access_hours')}     source="packet" />
          <AutoField label="Truck Parking"      value={val(packet, 'load_in', 'truck_parking')}         source="packet" />
          <AutoField label="Bus Parking"        value={val(packet, 'load_in', 'bus_parking')}           source="packet" />
          <AutoField label="Shore Power"        value={val(packet, 'load_in', 'shore_power_parking')}   source="packet" />
          <AutoField label="Load-In Notes"      value={val(packet, 'load_in', 'load_in_access')}        source="packet" />
        </div>
      </Section>

      {/* ── HOSPITALITY ───────────────────────────────────────────────── */}
      <Section title="Hospitality">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
          <AutoField label="Dressing Rooms"    value={val(packet, 'hospitality', 'dressing_rooms')}             source="packet" />
          <AutoField label="Showers"           value={val(packet, 'hospitality', 'shower_count')}               source="packet" />
          <AutoField label="Laundry"           value={val(packet, 'hospitality', 'laundry')}                    source="packet" />
          <AutoField label="Production Office" value={val(packet, 'hospitality', 'production_office_location')} source="packet" />
          <AutoField label="Bath Towels Req."  value={val(rider, 'hospitality', 'bath_towels')}                 source="rider" />
          <AutoField label="Stage Towels Req." value={val(rider, 'hospitality', 'stage_towels')}                source="rider" />
          <AutoField label="Tabling Needs"     value={val(rider, 'hospitality', 'tabling_needs')}               source="rider" />
          <AutoField label="After-Show Cash"   value={val(rider, 'hospitality', 'aftershow_cash')}              source="rider" />
          <AutoField label="Venue Catering"    value={val(packet, 'hospitality', 'venue_catering')}             source="packet" />
          <AutoField label="Ice Machine"       value={val(packet, 'hospitality', 'ice_machine')}                source="packet" />
        </div>
      </Section>

      {/* ── VIDEO ─────────────────────────────────────────────────────── */}
      <Section title="Video">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
          <AutoField label="Streaming Platform"   value={val(rider, 'video', 'streaming_platform')}                              source="rider" />
          <AutoField label="Internet Requirement" value={val(rider, 'video', 'internet_requirement')}                            source="rider" />
          <AutoField label="Venue WiFi"           value={val(packet, 'hospitality', 'wifi_notes')}                               source="packet" />
          <AutoField label="IMAG Screens"         value={val(packet, 'video', 'led_wall') || val(packet, 'video', 'projector_screen')} source="packet" />
          <AutoField label="Video Input Types"    value={val(packet, 'video', 'video_inputs')}                                   source="packet" />
        </div>
      </Section>

      {/* ── NOTES ─────────────────────────────────────────────────────── */}
      <Section title="Notes">
        <div className="space-y-4">
          <AutoField label="Standard Advance Note" value={val(rider, 'production_notes', 'standard_note')} source="rider" />
          <EditField label="Show Notes"     fieldKey="show_notes"     fields={fields} set={set} multiline />
          <EditField label="Security Notes" fieldKey="security_notes" fields={fields} set={set} multiline
            placeholder="Security protocols, emergency exits, who holds authority during evacuation…" />
          <EditField label="Additional Notes" fieldKey="additional_notes" fields={fields} set={set} multiline
            placeholder="Anything not covered above that is vital to understand before the show." />
        </div>
      </Section>

    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white overflow-hidden">
      <div className="px-5 py-3 border-b border-zinc-100 bg-zinc-50">
        <h2 className="text-sm font-semibold text-zinc-700">{title}</h2>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  )
}

function HotPoint({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-zinc-50 border border-zinc-100 px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400 mb-0.5">{label}</p>
      <p className={cn('text-sm font-medium', value ? 'text-zinc-800' : 'text-zinc-300')}>
        {value || '—'}
      </p>
    </div>
  )
}

type DataSource = 'rider' | 'packet' | 'input-list' | 'show'

const SOURCE_STYLES: Record<DataSource, { label: string; className: string }> = {
  rider:        { label: 'Tech Rider',   className: 'text-violet-600 bg-violet-50 border-violet-100' },
  packet:       { label: 'Venue Packet', className: 'text-blue-600 bg-blue-50 border-blue-100' },
  'input-list': { label: 'Input List',   className: 'text-amber-600 bg-amber-50 border-amber-100' },
  show:         { label: 'Show',         className: 'text-zinc-500 bg-zinc-50 border-zinc-200' },
}

function AutoField({ label, value, source }: { label: string; value: string; source: DataSource }) {
  const s = SOURCE_STYLES[source]
  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-1.5">
        <p className="text-xs text-zinc-400">{label}</p>
        <span className={cn('inline-block text-[9px] font-semibold border rounded px-1 py-px leading-tight', s.className)}>
          {s.label}
        </span>
      </div>
      <p className={cn('text-sm', value ? 'text-zinc-800' : 'text-zinc-300 italic')}>
        {value || '—'}
      </p>
    </div>
  )
}

function EditField({
  label, fieldKey, fields, set, placeholder, multiline, span2,
}: {
  label: string
  fieldKey: string
  fields: Record<string, string>
  set: (key: string, value: string) => void
  placeholder?: string
  multiline?: boolean
  span2?: boolean
}) {
  const value = fields[fieldKey] ?? ''
  return (
    <div className={cn('space-y-1', span2 && 'sm:col-span-2')}>
      <label className="text-xs font-medium text-zinc-600">{label}</label>
      {multiline ? (
        <Textarea
          value={value}
          onChange={e => set(fieldKey, e.target.value)}
          placeholder={placeholder}
          className="resize-none text-sm"
          rows={2}
        />
      ) : (
        <Input
          value={value}
          onChange={e => set(fieldKey, e.target.value)}
          placeholder={placeholder}
          className="text-sm h-8"
        />
      )}
    </div>
  )
}

function ContactField({ label, value, source }: { label: string; value: string; source: DataSource }) {
  const s = SOURCE_STYLES[source]
  return (
    <div className="flex gap-3">
      <div className="w-36 shrink-0 space-y-0.5">
        <p className="text-xs text-zinc-400 leading-tight">{label}</p>
        <span className={cn('inline-block text-[9px] font-semibold border rounded px-1 py-px leading-tight', s.className)}>
          {s.label}
        </span>
      </div>
      <span className={cn('text-sm pt-0.5', value ? 'text-zinc-800' : 'text-zinc-300 italic')}>
        {value || '—'}
      </span>
    </div>
  )
}
