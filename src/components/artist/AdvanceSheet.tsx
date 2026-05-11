'use client'

import React, { useState, useContext, createContext } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Save, MessageSquare, ChevronDown, ChevronUp, Check, AlertTriangle, AlertCircle, Info, ClipboardCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TechRiderSection, PacketSection, FieldConfirmation } from '@/lib/types'
import { PACKET_SECTIONS } from '@/lib/types'
import { ConfirmButton } from '@/components/artist/ConfirmButton'
import { computeConflicts, sortConflicts, SEVERITY_COLOR, SEVERITY_LABEL } from '@/lib/conflicts'
import type { Conflict, ConflictSeverity } from '@/lib/conflicts'
import { AdvanceCheck } from '@/components/artist/AdvanceCheck'
import { ShowNotesLog } from '@/components/artist/ShowNotesLog'
import type { ShowNote } from '@/lib/types'

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

// ── Field Request Context ─────────────────────────────────────────────────────

interface FieldRequestCtx {
  queued: Set<string>
  toggle: (path: string) => void
}
const FieldRequestContext = createContext<FieldRequestCtx | null>(null)

// ── Confirmation Context ──────────────────────────────────────────────────────

interface ConfirmationCtx {
  confirmations: Record<string, FieldConfirmation>
  confirm: (key: string, c: FieldConfirmation) => void
  clear: (key: string) => void
  currentUser: string
}
const ConfirmationContext = createContext<ConfirmationCtx | null>(null)

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  showId: string
  advanceId: string
  userId: string
  currentUser: string
  tourId: string
  riderId: string | null
  packetLastUpdated: string | null
  packetStatus: string | null
  initialFields: Record<string, string | null>
  initialConfirmations: Record<string, FieldConfirmation>
  tour: { artist_name: string; tour_name: string }
  show: { event_date: string }
  venue: { name: string; address: string | null; city: string | null; state: string | null; capacity: number | null } | null
  venueId: string | null
  riderSections: TechRiderSection[]
  packetSections: PacketSection[]
  venuePacketApproved: boolean
  initialNotes: ShowNote[]
}

// ── Component ─────────────────────────────────────────────────────────────────

export function AdvanceSheet({
  advanceId,
  showId,
  userId,
  currentUser,
  tourId,
  riderId,
  packetLastUpdated,
  packetStatus,
  initialFields,
  initialConfirmations,
  tour,
  show,
  venue,
  venueId,
  riderSections,
  packetSections,
  venuePacketApproved,
  initialNotes,
}: Props) {
  const router = useRouter()
  const [fields, setFields] = useState<Record<string, string>>(
    Object.fromEntries(
      Object.entries(initialFields).map(([k, v]) => [k, v ?? ''])
    )
  )
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirmations, setConfirmations] = useState<Record<string, FieldConfirmation>>(
    initialConfirmations ?? {}
  )

  const rider = buildMap(riderSections)
  const packet = buildMap(packetSections)

  // Conflict detection
  const conflicts = sortConflicts(computeConflicts(rider, packet))
  const criticalCount = conflicts.filter(c => c.severity === 'critical').length
  const warningCount  = conflicts.filter(c => c.severity === 'warning').length
  const missingCount  = conflicts.filter(c => c.severity === 'missing').length

  // Missing required packet fields for the discovery panel
  const missingRequiredPacketFields = PACKET_SECTIONS.flatMap(sectionDef =>
    sectionDef.fields
      .filter(f => f.required)
      .filter(f => {
        const v = packet.get(sectionDef.key)?.[f.key]
        return v == null || v === '' || v === false
      })
      .map(f => ({
        path: `${sectionDef.key}.${f.key}`,
        sectionLabel: sectionDef.label,
        fieldLabel: f.label,
      }))
  )

  const [requestOpen, setRequestOpen] = useState(false)
  const [queuedFields, setQueuedFields] = useState<Set<string>>(new Set())
  const [requestMessage, setRequestMessage] = useState('')
  const [sendingRequest, setSendingRequest] = useState(false)

  function set(key: string, value: string) {
    setFields(prev => ({ ...prev, [key]: value }))
    setDirty(true)
  }

  function toggleField(path: string) {
    setQueuedFields(prev => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
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

  async function handleSendRequest() {
    if (!venueId || queuedFields.size === 0) return
    setSendingRequest(true)
    const supabase = createClient()
    const { error } = await supabase.from('packet_field_requests').insert({
      venue_id: venueId,
      requester_profile_id: userId,
      show_id: showId,
      requested_fields: Array.from(queuedFields),
      message: requestMessage.trim() || null,
    })
    if (error) { toast.error(error.message); setSendingRequest(false); return }
    toast.success('Request sent — the venue will see it on their packet page')
    setQueuedFields(new Set())
    setRequestMessage('')
    setSendingRequest(false)
    router.refresh()
  }

  async function saveConfirmation(fieldKey: string, c: FieldConfirmation) {
    const next = { ...confirmations, [fieldKey]: c }
    setConfirmations(next)
    const supabase = createClient()
    const { error } = await supabase
      .from('show_advances')
      .update({ field_confirmations: next })
      .eq('id', advanceId)
    if (error) toast.error('Failed to save confirmation')
  }

  async function clearConfirmation(fieldKey: string) {
    const next = { ...confirmations }
    delete next[fieldKey]
    setConfirmations(next)
    const supabase = createClient()
    const { error } = await supabase
      .from('show_advances')
      .update({ field_confirmations: next })
      .eq('id', advanceId)
    if (error) toast.error('Failed to clear confirmation')
  }

  const formattedDate = new Date(show.event_date + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  })

  const fieldRequestCtx: FieldRequestCtx | null = venueId
    ? { queued: queuedFields, toggle: toggleField }
    : null

  const confirmationCtx: ConfirmationCtx = {
    confirmations,
    confirm: saveConfirmation,
    clear: clearConfirmation,
    currentUser,
  }

  const queuedFieldList = Array.from(queuedFields).map(path => {
    const [sKey, fKey] = path.split('.')
    const sectionDef = PACKET_SECTIONS.find(s => s.key === sKey)
    const fieldDef = sectionDef?.fields.find(f => f.key === fKey)
    return { path, label: fieldDef ? `${sectionDef!.label} · ${fieldDef.label}` : path }
  })

  return (
    <ConfirmationContext.Provider value={confirmationCtx}>
    <FieldRequestContext.Provider value={fieldRequestCtx}>
      <div className={cn('space-y-6', queuedFields.size > 0 && 'pb-20')}>

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

        {/* ── CONFLICT PANEL ─────────────────────────────────────────────── */}
        {conflicts.length > 0 && (
          <ConflictPanel conflicts={conflicts} criticalCount={criticalCount} warningCount={warningCount} missingCount={missingCount} />
        )}

        {/* ── PRE-ADVANCE CHECKS ─────────────────────────────────────────── */}
        {venuePacketApproved && (
          <PreAdvanceChecks
            riderSections={riderSections}
            packetSections={packetSections}
            packetLastUpdated={packetLastUpdated}
            packetStatus={packetStatus}
            tourId={tourId}
            riderId={riderId}
            venueId={venueId}
            hasVenue={!!venue}
          />
        )}

        {/* ── VENUE REQUEST PANEL ────────────────────────────────────────── */}
        {venueId && missingRequiredPacketFields.length > 0 && (
          <div className="rounded-lg border border-orange-200 bg-white overflow-hidden">
            <button
              className="w-full flex items-center justify-between px-4 py-3 text-left"
              onClick={() => setRequestOpen(v => !v)}
            >
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-orange-400" />
                <span className="text-sm font-medium text-zinc-700">
                  {missingRequiredPacketFields.length} required field{missingRequiredPacketFields.length !== 1 ? 's' : ''} missing from venue packet
                </span>
                <span className="text-xs text-zinc-400">— add to request queue</span>
              </div>
              {requestOpen ? <ChevronUp className="h-4 w-4 text-zinc-400" /> : <ChevronDown className="h-4 w-4 text-zinc-400" />}
            </button>

            {requestOpen && (
              <div className="border-t border-zinc-100 px-4 pb-4 pt-3 space-y-3">
                <p className="text-xs text-zinc-500">
                  Select the fields you need. They'll be added to your request queue and sent to the venue as one message.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {missingRequiredPacketFields.map(f => (
                    <label key={f.path} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        className="rounded border-zinc-300"
                        checked={queuedFields.has(f.path)}
                        onChange={() => toggleField(f.path)}
                      />
                      <span className="text-xs text-zinc-600">
                        <span className="text-zinc-400">{f.sectionLabel} · </span>{f.fieldLabel}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── NOTES LOG ──────────────────────────────────────────────────── */}
        <ShowNotesLog advanceId={advanceId} initialNotes={initialNotes} />

        {/* ── HOT POINTS ─────────────────────────────────────────────────── */}
        <HotPointsSection confirmations={confirmations}>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            <HotPoint label="Stage Dims"   value={val(packet, 'stage', 'full_deck')}        packetPath="stage.full_deck" />
            <HotPoint label="Wing SL"      value={val(packet, 'stage', 'wing_sl')}           packetPath="stage.wing_sl" />
            <HotPoint label="Wing SR"      value={val(packet, 'stage', 'wing_sr')}           packetPath="stage.wing_sr" />
            <HotPoint label="Trim Height"  value={val(packet, 'stage', 'trim_height')}       packetPath="stage.trim_height" />
            <HotPoint label="Docks"        value={val(packet, 'load_in', 'dock_bays')}       packetPath="load_in.dock_bays" />
            <HotPoint label="Dock Height"  value={val(packet, 'load_in', 'dock_height')}     packetPath="load_in.dock_height" />
            <HotPoint label="SPL Limit"    value={val(packet, 'audio', 'decibel_limit')}     packetPath="audio.decibel_limit" />
            <HotPoint label="Hard Curfew"  value={val(packet, 'schedule', 'hard_curfew')}    packetPath="schedule.hard_curfew" />
            <HotPoint label="Crew Access"  value={val(packet, 'schedule', 'crew_access')}    packetPath="schedule.crew_access" />
            <HotPoint label="Internet"     value={val(packet, 'hospitality', 'wifi_notes')}  packetPath="hospitality.wifi_notes" />
            <HotPoint label="Union"        value={val(packet, 'crew', 'union_affiliation')}  packetPath="crew.union_affiliation" />
            <HotPoint label="Service Type" value={val(packet, 'power', 'service_type')}      packetPath="power.service_type" />
          </div>
        </HotPointsSection>

        {/* ── SHOW INFO ──────────────────────────────────────────────────── */}
        <Section title="Show">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
            <AutoField label="Date"            value={formattedDate}                                                          source="show" />
            <AutoField label="Venue"           value={venue?.name ?? ''}                                                      source="show" />
            <AutoField label="Address"         value={[venue?.address, venue?.city, venue?.state].filter(Boolean).join(', ')} source="show" />
            <AutoField label="Capacity"        value={venue?.capacity ? venue.capacity.toLocaleString() : ''}                source="show" />
            <EditField label="Age Restrictions"     fieldKey="age_restrictions"   fields={fields} set={set} placeholder="e.g. 18+, All Ages" />
            <EditField label="Indoor / Outdoor"     fieldKey="indoor_outdoor"     fields={fields} set={set} placeholder="e.g. Indoor" />
            <EditField label="Time Zone"            fieldKey="time_zone"          fields={fields} set={set} placeholder="e.g. ET" />
            <EditField label="Promoter / Rep"       fieldKey="promoter_rep"       fields={fields} set={set} />
            <EditField label="Settlement Contact"   fieldKey="settlement_contact" fields={fields} set={set} />
            <EditField label="Deal Type"            fieldKey="deal_type"          fields={fields} set={set} />
            <EditField label="Deal Notes"           fieldKey="deal_notes"         fields={fields} set={set} multiline span2 />
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
              <ContactField label="Production Manager"      value={val(packet, 'contacts', 'production_manager')}   source="packet" packetPath="contacts.production_manager" />
              <ContactField label="General Manager"         value={val(packet, 'contacts', 'general_manager')}      source="packet" packetPath="contacts.general_manager" />
              <ContactField label="Advance Contact"         value={val(packet, 'contacts', 'advance_contact')}      source="packet" packetPath="contacts.advance_contact" />
              <ContactField label="House Sound"             value={val(packet, 'contacts', 'house_sound_engineer')} source="packet" packetPath="contacts.house_sound_engineer" />
              <ContactField label="House LD"                value={val(packet, 'contacts', 'house_ld')}             source="packet" packetPath="contacts.house_ld" />
              <ContactField label="Head Rigger"             value={val(packet, 'contacts', 'head_rigger')}          source="packet" packetPath="contacts.head_rigger" />
              <ContactField label="Stage Manager"           value={val(packet, 'contacts', 'stage_manager')}        source="packet" packetPath="contacts.stage_manager" />
              <ContactField label="Security Contact"        value={val(packet, 'contacts', 'security_contact')}     source="packet" packetPath="contacts.security_contact" />
              <ContactField label="Emergency / After Hours" value={val(packet, 'contacts', 'emergency_contact')}    source="packet" packetPath="contacts.emergency_contact" />
              <ContactField label="Box Office"              value={val(packet, 'contacts', 'box_office')}           source="packet" packetPath="contacts.box_office" />
            </div>
          </Section>

          <Section title="Tour Contacts">
            <div className="space-y-3">
              <ContactField label="Tour Manager"         value={val(rider, 'tour_info', 'tour_manager')}         source="rider" />
              <ContactField label="Production Manager"   value={val(rider, 'tour_info', 'production_manager')}   source="rider" />
              <ContactField label="Production Assistant" value={val(rider, 'tour_info', 'production_assistant')} source="rider" />
              <ContactField label="Tour Merch"           value={val(rider, 'tour_info', 'merch')}                source="rider" />
              <ContactField label="Lead Driver"          value={val(rider, 'tour_info', 'lead_driver')}          source="rider" />
            </div>
          </Section>
        </div>

        {/* ── SCHEDULE ──────────────────────────────────────────────────── */}
        <Section title="Schedule">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
            <AutoField label="Earliest Crew Access"  value={val(packet, 'schedule', 'crew_access')}       source="packet" packetPath="schedule.crew_access" />
            <AutoField label="Load-In Window"        value={val(packet, 'schedule', 'load_in_window')}    source="packet" packetPath="schedule.load_in_window" />
            <AutoField label="Soundcheck Window"     value={val(packet, 'schedule', 'soundcheck_window')} source="packet" packetPath="schedule.soundcheck_window" />
            <AutoField label="Doors (venue)"         value={val(packet, 'schedule', 'doors_open')}        source="packet" packetPath="schedule.doors_open" />
            <AutoField label="Hard Curfew"           value={val(packet, 'schedule', 'hard_curfew')}       source="packet" packetPath="schedule.hard_curfew" />
            <AutoField label="Load-Out Window"       value={val(packet, 'schedule', 'load_out_window')}   source="packet" packetPath="schedule.load_out_window" />
            <EditField label="Curfew Enforcement"    fieldKey="curfew_enforcement" fields={fields} set={set} placeholder="e.g. Venue security cuts power at 11:00 PM sharp" span2 />
            <div className="col-span-full border-t border-zinc-100 pt-4 mt-1">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-3">Show Times</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                <EditField label="Load-In Call"       fieldKey="load_in_call"        fields={fields} set={set} placeholder="e.g. 9:00 AM" />
                <EditField label="Crew Call"          fieldKey="crew_call"           fields={fields} set={set} placeholder="e.g. 9:30 AM (local stagehands)" />
                <EditField label="Support Soundcheck" fieldKey="support_soundcheck"  fields={fields} set={set} placeholder="e.g. 4:30 PM" />
                <EditField label="Opener Set"         fieldKey="opener_set_time"     fields={fields} set={set} placeholder="e.g. 7:00 PM" />
                <EditField label="Doors"              fieldKey="doors_time"          fields={fields} set={set} placeholder="e.g. 7:00 PM" />
                <EditField label="Show Start"         fieldKey="show_start_time"     fields={fields} set={set} placeholder="e.g. 8:00 PM" />
                <EditField label="Set 1"          fieldKey="set1_duration"   fields={fields} set={set} placeholder="e.g. 75 min" />
                <EditField label="Set Break"      fieldKey="set_break"       fields={fields} set={set} placeholder="e.g. 30 min" />
                <EditField label="Set 2"          fieldKey="set2_duration"   fields={fields} set={set} placeholder="e.g. 75 min" />
                <EditField label="Encore"         fieldKey="encore_duration" fields={fields} set={set} placeholder="e.g. 20 min" />
                <EditField label="Show Curfew"    fieldKey="curfew_time"     fields={fields} set={set} placeholder="e.g. 11:00 PM" />
              </div>
            </div>
            <div className="col-span-full border-t border-zinc-100 pt-4 mt-1">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-3">Day 2 / Multi-Day</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                <EditField label="Day 2 Venue Access"  fieldKey="day2_venue_access"  fields={fields} set={set} placeholder="e.g. 10:00 AM" />
                <EditField label="Day 2 Crew Call"     fieldKey="day2_crew_call"     fields={fields} set={set} placeholder="e.g. 11:00 AM" />
                <EditField label="Day 2 Show Start"    fieldKey="day2_show_start"    fields={fields} set={set} placeholder="e.g. 8:00 PM" />
                <EditField label="Day 2 Load Out"      fieldKey="day2_load_out"      fields={fields} set={set} placeholder="e.g. After show" />
                <EditField label="Multi-Day Notes"     fieldKey="multiday_notes"     fields={fields} set={set} multiline span2 />
              </div>
            </div>
          </div>
        </Section>

        {/* ── AUDIO / LIGHTING ──────────────────────────────────────────── */}
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
              <AutoField label="SPL Limit"          value={val(packet, 'audio', 'decibel_limit')}         source="packet" packetPath="audio.decibel_limit" />
              <AutoField label="Venue Console I/O"  value={val(packet, 'audio', 'console_io_format')}     source="packet" packetPath="audio.console_io_format" />
              <AutoField label="Tie-In Possible"    value={val(packet, 'audio', 'touring_console_tie_in')} source="packet" packetPath="audio.touring_console_tie_in" />
              <div className="pt-2 border-t border-zinc-100">
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">FOH Position</p>
                <div className="space-y-2">
                  <AutoField label="DSE to FOH"  value={val(packet, 'stage', 'foh_distance')} source="packet" packetPath="stage.foh_distance" />
                  <AutoField label="FOH Depth"   value={val(packet, 'stage', 'foh_depth')}    source="packet" packetPath="stage.foh_depth" />
                  <AutoField label="Snake Run"   value={val(packet, 'stage', 'snake_run')}    source="packet" packetPath="stage.snake_run" />
                  <EditField label="FOH Covering / Retractable" fieldKey="foh_covering"   fields={fields} set={set} placeholder="e.g. Permanent roof, retractable tarp" />
                  <EditField label="Lighting Riser Needed"      fieldKey="lighting_riser" fields={fields} set={set} placeholder="e.g. 4×8 @ 2′ center FOH" />
                  <EditField label="Camera Riser Needed"        fieldKey="camera_riser"   fields={fields} set={set} placeholder="e.g. 4×8 @ 2′ center FOH" />
                </div>
              </div>
            </div>
          </Section>

          <Section title="Lighting">
            <div className="space-y-3">
              <AutoField label="House Rig Struck"  value={val(rider, 'lighting', 'house_rig_struck')} source="rider" />
              <AutoField label="CO₂ Request"       value={val(rider, 'lighting', 'co2_request')}      source="rider" />
              <AutoField label="Tour LD"           value={val(rider, 'lighting', 'tour_ld')}           source="rider" />
              <AutoField label="Haze Notes"        value={val(rider, 'lighting', 'haze_notes')}        source="rider" />
              <AutoField label="Venue Haze Policy" value={val(packet, 'lighting', 'haze_fog')}         source="packet" packetPath="lighting.haze_fog" />
              <AutoField label="Venue Console"     value={val(packet, 'lighting', 'console')}          source="packet" packetPath="lighting.console" />
              <AutoField label="Guest Console OK"  value={val(packet, 'lighting', 'guest_console')}    source="packet" packetPath="lighting.guest_console" />
              <AutoField label="Follow Spots"      value={val(packet, 'lighting', 'follow_spots')}     source="packet" packetPath="lighting.follow_spots" />
            </div>
          </Section>
        </div>

        {/* ── STAGE & RIGGING ───────────────────────────────────────────── */}
        <Section title="Stage & Rigging">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-3">
            <AutoField label="Full Deck (W×D×H)"      value={val(packet, 'stage', 'full_deck')}          source="packet" packetPath="stage.full_deck" />
            <AutoField label="Performance Area"        value={val(packet, 'stage', 'performance_area')}   source="packet" packetPath="stage.performance_area" />
            <AutoField label="Stage Height"            value={val(packet, 'stage', 'stage_height')}       source="packet" packetPath="stage.stage_height" />
            <AutoField label="Stage Surface"           value={val(packet, 'stage', 'surface_type')}       source="packet" packetPath="stage.surface_type" />
            <AutoField label="Deck Load Capacity"      value={val(packet, 'stage', 'deck_load')}          source="packet" packetPath="stage.deck_load" />
            <AutoField label="Wing Space SL"           value={val(packet, 'stage', 'wing_sl')}            source="packet" packetPath="stage.wing_sl" />
            <AutoField label="Wing Space SR"           value={val(packet, 'stage', 'wing_sr')}            source="packet" packetPath="stage.wing_sr" />
            <AutoField label="Trim / Grid Height"      value={val(packet, 'stage', 'trim_height')}        source="packet" packetPath="stage.trim_height" />
            <AutoField label="Fly System"              value={val(packet, 'stage', 'fly_system')}         source="packet" packetPath="stage.fly_system" />
            <AutoField label="Line Sets"               value={val(packet, 'stage', 'line_sets')}          source="packet" packetPath="stage.line_sets" />
            <AutoField label="Per-Batten Capacity"     value={val(packet, 'stage', 'batten_capacity')}    source="packet" packetPath="stage.batten_capacity" />
            <AutoField label="Motor Points / Capacity" value={val(packet, 'stage', 'rigging_points')}     source="packet" packetPath="stage.rigging_points" />
            <AutoField label="Rigging Inspection"      value={val(packet, 'stage', 'rigging_inspection')} source="packet" packetPath="stage.rigging_inspection" />
            <AutoField label="Min Stage Width Req."    value={val(rider, 'stage_requirements', 'min_stage_width')}    source="rider" />
            <AutoField label="Min Stage Depth Req."    value={val(rider, 'stage_requirements', 'min_stage_depth')}    source="rider" />
            <AutoField label="Venue Risers"            value={val(packet, 'stage', 'risers')}             source="packet" packetPath="stage.risers" />
            <AutoField label="Risers Needed"           value={val(rider, 'stage_requirements', 'risers_needed')}      source="rider" />
            <AutoField label="Upstage Black Required"  value={val(rider, 'stage_requirements', 'upstage_black')}      source="rider" />
            <AutoField label="Dead Storage Needs"      value={val(rider, 'stage_requirements', 'dead_storage_needs')} source="rider" />
            <AutoField label="Dead Case Storage"       value={val(packet, 'load_in', 'dead_case_storage')} source="packet" packetPath="load_in.dead_case_storage" />
            <AutoField label="Barricade Distance"      value={val(rider, 'stage_requirements', 'barricade_distance')} source="rider" />
            <AutoField label="Barricade Type"          value={val(rider, 'stage_requirements', 'barricade_type')}     source="rider" />
            <AutoField label="Production in Pit"       value={val(rider, 'stage_requirements', 'production_in_pit')}  source="rider" />
            <EditField label="Barricade Breaks Needed" fieldKey="barricade_breaks" fields={fields} set={set} placeholder="e.g. 1 center break" />
            <EditField label="Wings / Screens"         fieldKey="wings_screens"    fields={fields} set={set} placeholder="e.g. 3-panel projection screen SR" />
            <EditField label="Tech Curtain / Pipe & Drape" fieldKey="tech_curtain" fields={fields} set={set} placeholder="e.g. Full black masking required" />
            <AutoField label="Stage Load-In Path"      value={val(packet, 'load_in', 'load_in_access')}   source="packet" packetPath="load_in.load_in_access" />
            <AutoField label="Freight Elevator"        value={val(packet, 'load_in', 'freight_elevator')} source="packet" packetPath="load_in.freight_elevator" />
            <AutoField label="Stage Clearance"         value={val(packet, 'load_in', 'stage_clearance')}  source="packet" packetPath="load_in.stage_clearance" />
          </div>
        </Section>

        {/* ── POWER ─────────────────────────────────────────────────────── */}
        <Section title="Power">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-3">
            <AutoField label="Rigging / LX Required"   value={val(rider, 'power', 'lx_rigging_power')}         source="rider" />
            <AutoField label="Rigging / LX Location"   value={val(rider, 'power', 'lx_rigging_location')}      source="rider" />
            <AutoField label="Audio Required"          value={val(rider, 'power', 'audio_power')}              source="rider" />
            <AutoField label="Audio Location"          value={val(rider, 'power', 'audio_location')}           source="rider" />
            <AutoField label="Video Required"          value={val(rider, 'power', 'video_power')}              source="rider" />
            <AutoField label="Video Location"          value={val(rider, 'power', 'video_location')}           source="rider" />
            <AutoField label="Extra Feeder Req."       value={val(rider, 'power', 'extra_feeder')}             source="rider" />
            <AutoField label="Venue Service Type"      value={val(packet, 'power', 'service_type')}            source="packet" packetPath="power.service_type" />
            <AutoField label="Voltage"                 value={val(packet, 'power', 'voltage')}                 source="packet" packetPath="power.voltage" />
            <AutoField label="Total Service"           value={val(packet, 'power', 'total_service')}           source="packet" packetPath="power.total_service" />
            <AutoField label="Available to Production" value={val(packet, 'power', 'available_to_production')} source="packet" packetPath="power.available_to_production" />
            <AutoField label="Panel Locations"         value={val(packet, 'power', 'power_location')}          source="packet" packetPath="power.power_location" />
            <AutoField label="Distro / Connector Type" value={val(packet, 'power', 'distro_type')}             source="packet" packetPath="power.distro_type" />
            <AutoField label="Known Issues"            value={val(packet, 'power', 'power_known_issues')}      source="packet" packetPath="power.power_known_issues" />
          </div>
        </Section>

        {/* ── LABOR ─────────────────────────────────────────────────────── */}
        <Section title="Labor">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
            <div className="col-span-full">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-3">Load In</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
                <AutoField label="Crew Chief"    value={val(rider, 'labor_defaults', 'crew_chief')}   source="rider" />
                <AutoField label="Electrician"   value={val(rider, 'labor_defaults', 'electrician')}  source="rider" />
                <AutoField label="Head Rigger"   value={val(rider, 'labor_defaults', 'head_rigger')}  source="rider" />
                <AutoField label="Up Riggers"    value={val(rider, 'labor_defaults', 'up_riggers')}   source="rider" />
                <AutoField label="Down Riggers"  value={val(rider, 'labor_defaults', 'down_riggers')} source="rider" />
                <AutoField label="Loaders"       value={val(rider, 'labor_defaults', 'loaders')}      source="rider" />
                <AutoField label="Forklift"      value={val(rider, 'labor_defaults', 'forklift')}     source="rider" />
                <AutoField label="1st Call"      value={[val(rider, 'labor_defaults', 'first_call_total'), val(rider, 'labor_defaults', 'first_call_breakdown')].filter(Boolean).join(' — ')} source="rider" />
                <AutoField label="2nd Call"      value={val(rider, 'labor_defaults', 'second_call_breakdown')} source="rider" />
              </div>
            </div>
            <div className="col-span-full border-t border-zinc-100 pt-4">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-3">Show Call</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
                <AutoField label="Venue Union"    value={val(packet, 'crew', 'union_affiliation')} source="packet" packetPath="crew.union_affiliation" />
                <AutoField label="Mandatory Crew" value={val(packet, 'crew', 'mandatory_crew')}    source="packet" packetPath="crew.mandatory_crew" />
                <AutoField label="Min Stagehands" value={val(packet, 'crew', 'min_stagehands')}    source="packet" packetPath="crew.min_stagehands" />
                <AutoField label="Available Crew" value={val(packet, 'crew', 'available_crew')}    source="packet" packetPath="crew.available_crew" />
                <EditField label="House Lights Op"  fieldKey="show_house_lights" fields={fields} set={set} placeholder="e.g. 1" />
                <EditField label="House Audio Op"   fieldKey="show_house_audio"  fields={fields} set={set} placeholder="e.g. 1" />
                <EditField label="Stagehands"       fieldKey="show_stagehands"   fields={fields} set={set} placeholder="e.g. See note below" />
                <EditField label="Camera Ops"       fieldKey="show_camera_ops"   fields={fields} set={set} placeholder="e.g. 2" />
                <EditField label="Cable Pager"      fieldKey="show_cable_pager"  fields={fields} set={set} placeholder="e.g. 1" />
              </div>
            </div>
            <div className="col-span-full border-t border-zinc-100 pt-4">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-3">Load Out</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
                <AutoField label="Load Out"           value={[val(rider, 'labor_defaults', 'load_out_total'), val(rider, 'labor_defaults', 'load_out_breakdown')].filter(Boolean).join(' — ')} source="rider" />
                <EditField label="Load Out Call Time" fieldKey="load_out_call" fields={fields} set={set} placeholder="e.g. All hands on site 30 min before show end" />
              </div>
            </div>
            <div className="col-span-full border-t border-zinc-100 pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
                <AutoField label="Min Call"         value={val(rider, 'labor_defaults', 'labor_min_call')} source="rider" />
                <AutoField label="Feeding Rules"    value={val(rider, 'labor_defaults', 'feeding_rules')}  source="rider" />
                <AutoField label="Union Meal Break" value={val(packet, 'crew', 'union_meal_break')}        source="packet" packetPath="crew.union_meal_break" />
                <EditField label="Labor Budget"     fieldKey="labor_budget"    fields={fields} set={set} placeholder="e.g. $15,000" />
                <EditField label="Catering Budget"  fieldKey="catering_budget" fields={fields} set={set} placeholder="e.g. $7,500" />
              </div>
            </div>
          </div>
        </Section>

        {/* ── LOAD-IN & PARKING ─────────────────────────────────────────── */}
        <Section title="Load-In & Parking">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-3">
            <AutoField label="Dock Height"        value={val(packet, 'load_in', 'dock_height')}          source="packet" packetPath="load_in.dock_height" />
            <AutoField label="Dock Door Dims"     value={val(packet, 'load_in', 'dock_door_dimensions')} source="packet" packetPath="load_in.dock_door_dimensions" />
            <AutoField label="Loading Bays"       value={val(packet, 'load_in', 'dock_bays')}            source="packet" packetPath="load_in.dock_bays" />
            <AutoField label="Dock Leveler"       value={val(packet, 'load_in', 'dock_leveler')}         source="packet" packetPath="load_in.dock_leveler" />
            <AutoField label="Forklift Available" value={val(packet, 'load_in', 'forklift')}             source="packet" packetPath="load_in.forklift" />
            <AutoField label="Pallet Jack"        value={val(packet, 'load_in', 'pallet_jack')}          source="packet" packetPath="load_in.pallet_jack" />
            <AutoField label="Dock Access Hours"  value={val(packet, 'load_in', 'dock_access_hours')}    source="packet" packetPath="load_in.dock_access_hours" />
            <AutoField label="Truck Parking"      value={val(packet, 'load_in', 'truck_parking')}        source="packet" packetPath="load_in.truck_parking" />
            <AutoField label="Bus Parking"        value={val(packet, 'load_in', 'bus_parking')}          source="packet" packetPath="load_in.bus_parking" />
            <AutoField label="Crew Parking"       value={val(packet, 'load_in', 'crew_parking')}         source="packet" packetPath="load_in.crew_parking" />
            <AutoField label="Overnight Parking"  value={val(packet, 'load_in', 'overnight_parking')}    source="packet" packetPath="load_in.overnight_parking" />
            <AutoField label="Shore Power"        value={val(packet, 'load_in', 'shore_power_parking')}  source="packet" packetPath="load_in.shore_power_parking" />
          </div>
        </Section>

        {/* ── HOSPITALITY ───────────────────────────────────────────────── */}
        <Section title="Hospitality">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
            <AutoField label="Dressing Rooms"    value={val(packet, 'hospitality', 'dressing_rooms')}             source="packet" packetPath="hospitality.dressing_rooms" />
            <AutoField label="Showers"           value={val(packet, 'hospitality', 'shower_count')}               source="packet" packetPath="hospitality.shower_count" />
            <AutoField label="Laundry"           value={val(packet, 'hospitality', 'laundry')}                    source="packet" packetPath="hospitality.laundry" />
            <AutoField label="Production Office" value={val(packet, 'hospitality', 'production_office_location')} source="packet" packetPath="hospitality.production_office_location" />
            <AutoField label="Catering Room"     value={val(packet, 'hospitality', 'catering_room')}              source="packet" packetPath="hospitality.catering_room" />
            <AutoField label="Ice Machine"       value={val(packet, 'hospitality', 'ice_machine')}                source="packet" packetPath="hospitality.ice_machine" />
            <AutoField label="Venue Catering"    value={val(packet, 'hospitality', 'venue_catering')}             source="packet" packetPath="hospitality.venue_catering" />
            <AutoField label="Bath Towels Req."  value={val(rider, 'hospitality', 'bath_towels')}                 source="rider" />
            <AutoField label="Stage Towels Req." value={val(rider, 'hospitality', 'stage_towels')}                source="rider" />
            <AutoField label="Tabling Needs"     value={val(rider, 'hospitality', 'tabling_needs')}               source="rider" />
            <AutoField label="After-Show Cash"   value={val(rider, 'hospitality', 'aftershow_cash')}              source="rider" />
            <AutoField label="Catering Rider"    value={val(rider, 'hospitality', 'catering_rider')}              source="rider" />
            <EditField label="Kitchen on Site"   fieldKey="kitchen_on_site"   fields={fields} set={set} placeholder="e.g. Full kitchen available" />
            <EditField label="Fridges in Rooms"  fieldKey="fridges_in_rooms"  fields={fields} set={set} placeholder="e.g. Yes — 1 per dressing room" />
            <EditField label="Warmer Available"  fieldKey="warmer_available"  fields={fields} set={set} placeholder="e.g. Yes" />
            <EditField label="Hard Line in PO"   fieldKey="hard_line_drop_po" fields={fields} set={set} placeholder="e.g. Yes — ethernet port at desk" />
          </div>
        </Section>

        {/* ── MERCH ─────────────────────────────────────────────────────── */}
        <Section title="Merch">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
            <AutoField label="Venue Merch Contact" value={val(packet, 'contacts', 'vip_merch_contact')}  source="packet" packetPath="contacts.vip_merch_contact" />
            <AutoField label="Venue Merch Info"    value={val(packet, 'hospitality', 'merchandise')}     source="packet" packetPath="hospitality.merchandise" />
            <EditField label="Who Sells"           fieldKey="merch_who_sells"         fields={fields} set={set} placeholder="e.g. Venue, Tour" />
            <EditField label="Split"               fieldKey="merch_split"             fields={fields} set={set} placeholder="e.g. 80/20 tour/venue" />
            <EditField label="Local Merch Contact" fieldKey="merch_local_contact"     fields={fields} set={set} />
            <EditField label="Contact Email"       fieldKey="merch_contact_email"     fields={fields} set={set} />
            <EditField label="Shipping Address"    fieldKey="merch_shipping_address"  fields={fields} set={set} multiline placeholder="Full address and any delivery instructions" />
            <EditField label="Push Details"        fieldKey="merch_push_details"      fields={fields} set={set} placeholder="e.g. Featured on venue social, email blast sent" />
            <EditField label="Merch Notes"         fieldKey="merch_notes"             fields={fields} set={set} multiline span2 />
          </div>
        </Section>

        {/* ── RUNNER ────────────────────────────────────────────────────── */}
        <Section title="Runner">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
            <EditField label="# Runners Needed"    fieldKey="runner_count"           fields={fields} set={set} placeholder="e.g. 2" />
            <EditField label="Vehicle Type"        fieldKey="runner_vehicle_type"    fields={fields} set={set} placeholder="e.g. SUV, Sprinter" />
            <EditField label="Can Drive Personnel" fieldKey="runner_drive_personnel" fields={fields} set={set} placeholder="e.g. Yes" />
            <EditField label="Runner Call Time"    fieldKey="runner_call_time"       fields={fields} set={set} placeholder="e.g. 8:00 AM" />
            <EditField label="Runner Cut Time"     fieldKey="runner_cut_time"        fields={fields} set={set} placeholder="e.g. After load out" />
            <EditField label="Restrictions"        fieldKey="runner_restrictions"    fields={fields} set={set} placeholder="e.g. No alcohol runs" />
            <EditField label="Runner Notes"        fieldKey="runner_notes"           fields={fields} set={set} multiline span2 />
          </div>
        </Section>

        {/* ── VIDEO ─────────────────────────────────────────────────────── */}
        <Section title="Video">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
            <AutoField label="Streaming Platform"   value={val(rider, 'video', 'streaming_platform')}                                   source="rider" />
            <AutoField label="Internet Requirement" value={val(rider, 'video', 'internet_requirement')}                                 source="rider" />
            <AutoField label="Venue WiFi"           value={val(packet, 'hospitality', 'wifi_notes')}                                    source="packet" packetPath="hospitality.wifi_notes" />
            <AutoField label="IMAG Screens"         value={val(packet, 'video', 'led_wall') || val(packet, 'video', 'projector_screen')} source="packet" packetPath="video.led_wall" />
            <AutoField label="Video Input Types"    value={val(packet, 'video', 'video_inputs')}                                        source="packet" packetPath="video.video_inputs" />
            <AutoField label="Venue Cameras"        value={val(packet, 'video', 'cameras')}                                             source="packet" packetPath="video.cameras" />
            <AutoField label="Video Switcher"       value={val(packet, 'video', 'video_switcher')}                                      source="packet" packetPath="video.video_switcher" />
            <EditField label="Video World Location"  fieldKey="video_world_location" fields={fields} set={set} placeholder="e.g. SL wing, 20ft from edge" />
            <EditField label="Broadcast Location"    fieldKey="broadcast_location"   fields={fields} set={set} placeholder="e.g. Production office" />
            <EditField label="Ethernet Drop Location" fieldKey="ethernet_drop"       fields={fields} set={set} placeholder="e.g. FOH booth, SL wing" />
            <EditField label="TVs to Tie In"         fieldKey="tvs_to_tie"           fields={fields} set={set} placeholder="e.g. 4 screens in concourse" />
            <EditField label="Video Tie Location"    fieldKey="video_tie_location"   fields={fields} set={set} placeholder="e.g. SL patch bay, room 101" />
            <EditField label="Video Tie Notes"       fieldKey="video_tie_notes"      fields={fields} set={set} multiline span2 />
          </div>
        </Section>

        {/* ── NOTES ─────────────────────────────────────────────────────── */}
        <Section title="Notes">
          <div className="space-y-4">
            <AutoField label="Standard Advance Note" value={val(rider, 'production_notes', 'standard_note')} source="rider" />
            <EditField label="Show Notes"       fieldKey="show_notes"       fields={fields} set={set} multiline />
            <EditField label="Security Notes"   fieldKey="security_notes"   fields={fields} set={set} multiline placeholder="Security protocols, emergency exits, who holds authority during evacuation…" />
            <EditField label="Additional Notes" fieldKey="additional_notes" fields={fields} set={set} multiline placeholder="Anything not covered above that is vital to understand before the show." />
          </div>
        </Section>

      </div>

      {/* ── REQUEST BAR ────────────────────────────────────────────────── */}
      {venueId && queuedFields.size > 0 && (
        <RequestBar
          venueName={venue?.name ?? null}
          fields={queuedFieldList}
          message={requestMessage}
          onMessageChange={setRequestMessage}
          onSend={handleSendRequest}
          onRemove={path => setQueuedFields(prev => { const n = new Set(prev); n.delete(path); return n })}
          onClear={() => setQueuedFields(new Set())}
          sending={sendingRequest}
        />
      )}
    </FieldRequestContext.Provider>
    </ConfirmationContext.Provider>
  )
}

// ── Pre-Advance Checks ────────────────────────────────────────────────────────

function PreAdvanceChecks({
  riderSections,
  packetSections,
  packetLastUpdated,
  packetStatus,
  tourId,
  riderId,
  venueId,
  hasVenue,
}: {
  riderSections: TechRiderSection[]
  packetSections: PacketSection[]
  packetLastUpdated: string | null
  packetStatus: string | null
  tourId: string
  riderId: string | null
  venueId: string | null
  hasVenue: boolean
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="rounded-lg border border-zinc-200 bg-white overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-zinc-50 transition-colors"
        onClick={() => setOpen(v => !v)}
      >
        <div className="flex items-center gap-2">
          <ClipboardCheck className="h-4 w-4 text-zinc-400" />
          <span className="text-sm font-medium text-zinc-700">Pre-Advance Checks</span>
          <span className="text-xs text-zinc-400">— critical items to verify before advancing</span>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-zinc-400" /> : <ChevronDown className="h-4 w-4 text-zinc-400" />}
      </button>
      {open && (
        <div className="border-t border-zinc-100 p-4">
          <AdvanceCheck
            embedded
            riderSections={riderSections}
            packetSections={packetSections}
            packetStatus={packetStatus}
            packetLastUpdated={packetLastUpdated}
            venueId={venueId}
            hasVenue={hasVenue}
            tourId={tourId}
            riderId={riderId}
          />
        </div>
      )}
    </div>
  )
}

// ── Request Bar ───────────────────────────────────────────────────────────────

function RequestBar({ venueName, fields, message, onMessageChange, onSend, onRemove, onClear, sending }: {
  venueName: string | null
  fields: { path: string; label: string }[]
  message: string
  onMessageChange: (v: string) => void
  onSend: () => void
  onRemove: (path: string) => void
  onClear: () => void
  sending: boolean
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 shadow-lg">
      {/* Expanded panel */}
      {expanded && (
        <div className="border-t border-orange-200 bg-white px-8 py-4 space-y-3">
          <div className="flex items-center justify-between max-w-5xl">
            <p className="text-sm font-semibold text-zinc-700">
              Requesting from{venueName ? `: ${venueName}` : ' venue'}
            </p>
            <button onClick={onClear} className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors">
              Clear all
            </button>
          </div>
          <ul className="space-y-1.5 max-w-5xl">
            {fields.map(f => (
              <li key={f.path} className="flex items-center justify-between gap-3 rounded-md bg-orange-50 border border-orange-100 px-3 py-2">
                <span className="text-sm text-zinc-700">{f.label}</span>
                <button
                  onClick={() => onRemove(f.path)}
                  className="text-xs text-orange-400 hover:text-orange-700 font-medium transition-colors shrink-0"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
          <div className="max-w-5xl">
            <Input
              value={message}
              onChange={e => onMessageChange(e.target.value)}
              placeholder="Optional note to the venue (e.g. advancing for Aug 27 show)..."
              className="text-sm h-9 bg-white border-orange-200 focus:border-orange-400"
            />
          </div>
        </div>
      )}

      {/* Collapsed bar */}
      <div className="border-t border-orange-200 bg-orange-50">
        <div className="flex items-center gap-3 px-8 py-3 max-w-5xl">
          <MessageSquare className="h-4 w-4 text-orange-500 shrink-0" />
          <span className="text-sm font-medium text-orange-700 shrink-0">
            {fields.length} field{fields.length !== 1 ? 's' : ''} queued
            {venueName && <span className="font-normal text-orange-500"> for {venueName}</span>}
          </span>
          <div className="flex-1" />
          <button
            onClick={() => setExpanded(v => !v)}
            className="text-xs font-medium text-orange-600 hover:text-orange-800 transition-colors shrink-0 flex items-center gap-1"
          >
            {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
            {expanded ? 'Collapse' : 'Review'}
          </button>
          <Button size="sm" onClick={onSend} disabled={sending}>
            <Check className="h-3.5 w-3.5 mr-1.5" />
            {sending ? 'Sending…' : 'Send request'}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Conflict Panel ────────────────────────────────────────────────────────────

const SEVERITY_ICON: Record<ConflictSeverity, React.ReactNode> = {
  critical: <AlertCircle className="h-3.5 w-3.5 shrink-0" />,
  warning:  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />,
  missing:  <Info className="h-3.5 w-3.5 shrink-0" />,
}

function ConflictPanel({ conflicts, criticalCount, warningCount, missingCount }: {
  conflicts: Conflict[]
  criticalCount: number
  warningCount: number
  missingCount: number
}) {
  const [open, setOpen] = useState(true)

  const summaryParts = [
    criticalCount > 0 && `${criticalCount} critical`,
    warningCount  > 0 && `${warningCount} warning${warningCount > 1 ? 's' : ''}`,
    missingCount  > 0 && `${missingCount} missing`,
  ].filter(Boolean).join(' · ')

  const headerColor = criticalCount > 0 ? 'border-red-200 bg-red-50' : warningCount > 0 ? 'border-amber-200 bg-amber-50' : 'border-zinc-200 bg-zinc-50'
  const headerText  = criticalCount > 0 ? 'text-red-700' : warningCount > 0 ? 'text-amber-700' : 'text-zinc-600'

  return (
    <div className={cn('rounded-lg border overflow-hidden', criticalCount > 0 ? 'border-red-200' : warningCount > 0 ? 'border-amber-200' : 'border-zinc-200')}>
      <button
        className={cn('w-full flex items-center justify-between px-4 py-3 text-left', headerColor)}
        onClick={() => setOpen(v => !v)}
      >
        <div className={cn('flex items-center gap-2 text-sm font-medium', headerText)}>
          {criticalCount > 0 ? <AlertCircle className="h-4 w-4" /> : warningCount > 0 ? <AlertTriangle className="h-4 w-4" /> : <Info className="h-4 w-4" />}
          <span>{conflicts.length} conflict{conflicts.length !== 1 ? 's' : ''} detected</span>
          <span className={cn('font-normal text-xs', criticalCount > 0 ? 'text-red-500' : warningCount > 0 ? 'text-amber-500' : 'text-zinc-400')}>
            — {summaryParts}
          </span>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-zinc-400" /> : <ChevronDown className="h-4 w-4 text-zinc-400" />}
      </button>

      {open && (
        <div className="divide-y divide-zinc-100 bg-white">
          {conflicts.map(c => {
            const colors = SEVERITY_COLOR[c.severity]
            return (
              <div key={c.id} className="px-4 py-3 flex gap-3 items-start">
                <span className={cn('inline-flex items-center gap-1 text-[10px] font-semibold rounded px-1.5 py-0.5 mt-0.5 shrink-0 border', colors.bg, colors.text, colors.border)}>
                  {SEVERITY_ICON[c.severity]}
                  {SEVERITY_LABEL[c.severity]}
                </span>
                <div className="min-w-0 space-y-0.5">
                  <p className="text-sm font-medium text-zinc-800">{c.category} · {c.label}</p>
                  <p className="text-xs text-zinc-500">{c.message}</p>
                  {(c.riderValue || c.venueValue) && (
                    <div className="flex gap-4 pt-0.5">
                      {c.riderValue && <span className="text-[10px] text-violet-600"><span className="font-semibold">Rider:</span> {c.riderValue}</span>}
                      {c.venueValue && <span className="text-[10px] text-blue-600"><span className="font-semibold">Venue:</span> {c.venueValue}</span>}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
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

const HOT_POINT_KEYS = [
  'stage.full_deck', 'stage.wing_sl', 'stage.wing_sr', 'stage.trim_height',
  'load_in.dock_bays', 'load_in.dock_height', 'audio.decibel_limit',
  'schedule.hard_curfew', 'schedule.crew_access', 'hospitality.wifi_notes',
  'crew.union_affiliation', 'power.service_type',
]

function HotPointsSection({ children, confirmations }: {
  children: React.ReactNode
  confirmations: Record<string, FieldConfirmation>
}) {
  const confirmedCount = HOT_POINT_KEYS.filter(k => !!confirmations[k]).length
  const total = HOT_POINT_KEYS.length
  const allDone = confirmedCount === total

  return (
    <div className="rounded-lg border border-zinc-200 bg-white overflow-hidden">
      <div className="px-5 py-3 border-b border-zinc-100 bg-zinc-50 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-700">Hot Points</h2>
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-24 rounded-full bg-zinc-200 overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all', allDone ? 'bg-emerald-500' : 'bg-zinc-400')}
              style={{ width: `${(confirmedCount / total) * 100}%` }}
            />
          </div>
          <span className={cn('text-[11px] font-medium tabular-nums', allDone ? 'text-emerald-600' : 'text-zinc-400')}>
            {confirmedCount}/{total} confirmed
          </span>
        </div>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  )
}

function HotPoint({ label, value, packetPath }: { label: string; value: string; packetPath?: string }) {
  const reqCtx = useContext(FieldRequestContext)
  const confCtx = useContext(ConfirmationContext)
  const isQueued = packetPath ? reqCtx?.queued.has(packetPath) : false
  const canRequest = !value && packetPath && reqCtx
  const confirmation = packetPath ? (confCtx?.confirmations[packetPath] ?? null) : null

  return (
    <div className="rounded-md bg-zinc-50 border border-zinc-100 px-3 py-2.5 group">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400 mb-0.5">{label}</p>
      <div className="flex items-start justify-between gap-2">
        <p className={cn('text-sm font-medium', value ? 'text-zinc-800' : 'text-zinc-300')}>
          {value || '—'}
        </p>
        <div className="flex items-center gap-1 shrink-0">
          {canRequest && !isQueued && (
            <button
              onClick={() => reqCtx.toggle(packetPath!)}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-orange-500 hover:text-orange-700 font-medium"
            >
              + Request
            </button>
          )}
          {isQueued && (
            <button
              onClick={() => reqCtx!.toggle(packetPath!)}
              className="text-xs text-orange-600 font-medium hover:text-orange-800"
            >
              Queued ✓
            </button>
          )}
          {value && confCtx && packetPath && (
            <ConfirmButton
              fieldKey={packetPath}
              confirmation={confirmation}
              onConfirm={c => confCtx.confirm(packetPath, c)}
              onClear={() => confCtx.clear(packetPath)}
              currentUser={confCtx.currentUser}
            />
          )}
        </div>
      </div>
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

function AutoField({ label, value, source, packetPath, confirmKey }: {
  label: string
  value: string
  source: DataSource
  packetPath?: string
  confirmKey?: string
}) {
  const reqCtx = useContext(FieldRequestContext)
  const confCtx = useContext(ConfirmationContext)
  const isQueued = packetPath ? reqCtx?.queued.has(packetPath) : false
  const canRequest = source === 'packet' && !value && packetPath && reqCtx
  const s = SOURCE_STYLES[source]
  const cKey = confirmKey ?? packetPath
  const confirmation = cKey ? (confCtx?.confirmations[cKey] ?? null) : null

  return (
    <div className="space-y-0.5 group">
      <div className="flex items-center gap-1.5 flex-wrap">
        <p className="text-xs text-zinc-400">{label}</p>
        <span className={cn('inline-block text-[9px] font-semibold border rounded px-1 py-px leading-tight', s.className)}>
          {s.label}
        </span>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <p className={cn('text-sm', value ? 'text-zinc-800' : 'text-zinc-300 italic')}>
          {value || '—'}
        </p>
        {canRequest && !isQueued && (
          <button
            onClick={() => reqCtx.toggle(packetPath!)}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-orange-500 hover:text-orange-700 font-medium"
          >
            + Request
          </button>
        )}
        {isQueued && (
          <button
            onClick={() => reqCtx!.toggle(packetPath!)}
            className="text-xs text-orange-600 font-medium hover:text-orange-800"
          >
            Queued ✓
          </button>
        )}
        {value && confCtx && cKey && (
          <ConfirmButton
            fieldKey={cKey}
            confirmation={confirmation}
            onConfirm={c => confCtx.confirm(cKey, c)}
            onClear={() => confCtx.clear(cKey)}
            currentUser={confCtx.currentUser}
          />
        )}
      </div>
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
  const confCtx = useContext(ConfirmationContext)
  const value = fields[fieldKey] ?? ''
  const confirmation = confCtx?.confirmations[fieldKey] ?? null

  return (
    <div className={cn('space-y-1 group', span2 && 'sm:col-span-2')}>
      <div className="flex items-center gap-1.5">
        <label className="text-xs font-medium text-zinc-600">{label}</label>
        {value && confCtx && (
          <ConfirmButton
            fieldKey={fieldKey}
            confirmation={confirmation}
            onConfirm={c => confCtx.confirm(fieldKey, c)}
            onClear={() => confCtx.clear(fieldKey)}
            currentUser={confCtx.currentUser}
          />
        )}
      </div>
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

function ContactField({ label, value, source, packetPath }: {
  label: string
  value: string
  source: DataSource
  packetPath?: string
}) {
  const reqCtx = useContext(FieldRequestContext)
  const confCtx = useContext(ConfirmationContext)
  const isQueued = packetPath ? reqCtx?.queued.has(packetPath) : false
  const canRequest = source === 'packet' && !value && packetPath && reqCtx
  const s = SOURCE_STYLES[source]
  const confirmation = packetPath ? (confCtx?.confirmations[packetPath] ?? null) : null

  return (
    <div className="flex gap-3 group">
      <div className="w-36 shrink-0 space-y-0.5">
        <p className="text-xs text-zinc-400 leading-tight">{label}</p>
        <span className={cn('inline-block text-[9px] font-semibold border rounded px-1 py-px leading-tight', s.className)}>
          {s.label}
        </span>
      </div>
      <div className="flex items-center gap-2 pt-0.5 min-w-0 flex-wrap">
        <span className={cn('text-sm', value ? 'text-zinc-800' : 'text-zinc-300 italic')}>
          {value || '—'}
        </span>
        {canRequest && !isQueued && (
          <button
            onClick={() => reqCtx.toggle(packetPath!)}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-orange-500 hover:text-orange-700 font-medium shrink-0"
          >
            + Request
          </button>
        )}
        {isQueued && (
          <button
            onClick={() => reqCtx!.toggle(packetPath!)}
            className="text-xs text-orange-600 font-medium shrink-0 hover:text-orange-800"
          >
            Queued ✓
          </button>
        )}
        {value && confCtx && packetPath && (
          <ConfirmButton
            fieldKey={packetPath}
            confirmation={confirmation}
            onConfirm={c => confCtx.confirm(packetPath, c)}
            onClear={() => confCtx.clear(packetPath)}
            currentUser={confCtx.currentUser}
          />
        )}
      </div>
    </div>
  )
}
