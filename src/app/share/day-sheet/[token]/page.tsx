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
function v(map: SectionMap, section: string, field: string): string {
  const val = map.get(section)?.[field]
  if (val == null || val === '') return ''
  if (typeof val === 'boolean') return val ? 'Yes' : 'No'
  return String(val)
}
function f(fields: Record<string, string | null>, key: string): string {
  return fields[key] ?? ''
}
function confDate(confirmations: Record<string, FieldConfirmation>, key: string): string | null {
  const c = confirmations[key]
  if (!c) return null
  return new Date(c.confirmedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default async function DaySheetSharePage({ params }: Props) {
  const { token } = await params
  const supabase = createAdminClient()

  const { data: share } = await supabase
    .from('advance_shares')
    .select('advance_id, show_id, type')
    .eq('token', token)
    .single()
  if (!share) notFound()
  if (share.type === 'advance') notFound()

  const [advanceResult, showResult] = await Promise.all([
    supabase.from('show_advances').select('fields, field_confirmations').eq('id', share.advance_id).single(),
    supabase.from('shows').select('*, venues(id, name, address, city, state, capacity), tours(id, tour_name, artist_name)').eq('id', share.show_id).single(),
  ])

  if (!advanceResult.data || !showResult.data) notFound()

  const show = showResult.data
  const venue = show.venues as { id: string; name: string; address: string | null; city: string | null; state: string | null; capacity: number | null } | null
  const tour = show.tours as { id: string; tour_name: string; artist_name: string } | null
  const fields = (advanceResult.data.fields ?? {}) as Record<string, string | null>
  const confirmations = (advanceResult.data.field_confirmations ?? {}) as Record<string, FieldConfirmation>

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

  const daySheetNotes = f(fields, 'day_sheet_notes')

  type TimeRow = { label: string; value: string; confirmKey?: string; warn?: boolean }
  const callTimes: TimeRow[] = [
    { label: 'Earliest Crew Access', value: v(packet, 'schedule', 'crew_access'), confirmKey: 'schedule.crew_access' },
    { label: 'Load-In Call', value: f(fields, 'load_in_call') },
    { label: 'Crew Call', value: f(fields, 'crew_call') },
    { label: 'Load-In Window', value: v(packet, 'schedule', 'load_in_window') },
    { label: 'Soundcheck', value: v(packet, 'schedule', 'soundcheck_window') },
    { label: 'Support Soundcheck', value: f(fields, 'support_soundcheck') },
    { label: 'Opener Set', value: f(fields, 'opener_set_time') },
    { label: 'Doors', value: f(fields, 'doors_time') || v(packet, 'schedule', 'doors_open') },
    { label: 'Show Start', value: f(fields, 'show_start_time') },
    { label: 'Set 1', value: f(fields, 'set1_duration') },
    { label: 'Set Break', value: f(fields, 'set_break') },
    { label: 'Set 2', value: f(fields, 'set2_duration') },
    { label: 'Encore', value: f(fields, 'encore_duration') },
    { label: 'Show End', value: f(fields, 'curfew_time') },
    { label: 'Hard Curfew ⚠', value: v(packet, 'schedule', 'hard_curfew'), confirmKey: 'schedule.hard_curfew', warn: true },
    { label: 'Load-Out', value: v(packet, 'schedule', 'load_out_window') },
    { label: 'Must Clear By', value: v(packet, 'schedule', 'clear_by') },
  ].filter(r => r.value)

  type CRow = { label: string; value: string; confirmKey?: string }
  const venueContacts: CRow[] = [
    { label: 'Production Manager', value: v(packet, 'contacts', 'production_manager'), confirmKey: 'contacts.production_manager' },
    { label: 'General Manager', value: v(packet, 'contacts', 'general_manager') },
    { label: 'Stage Manager', value: v(packet, 'contacts', 'stage_manager') },
    { label: 'Security', value: v(packet, 'contacts', 'security_contact') },
    { label: 'Emergency / After Hours', value: v(packet, 'contacts', 'emergency_contact'), confirmKey: 'contacts.emergency_contact' },
    { label: 'Box Office', value: v(packet, 'contacts', 'box_office') },
  ].filter(c => c.value)

  const tourContacts: CRow[] = [
    { label: 'Tour Manager', value: v(rider, 'tour_info', 'tour_manager') },
    { label: 'Production Manager', value: v(rider, 'tour_info', 'production_manager') },
    { label: 'Production Assistant', value: v(rider, 'tour_info', 'production_assistant') },
    { label: 'FOH Engineer', value: v(rider, 'tour_info', 'foh_engineer') },
    { label: 'Head Rigger', value: v(rider, 'tour_info', 'head_rigger') },
    { label: 'Tour LD', value: v(rider, 'lighting', 'tour_ld') },
    { label: 'Tour Merch', value: v(rider, 'tour_info', 'merch') },
    { label: 'Lead Driver', value: v(rider, 'tour_info', 'lead_driver') },
  ].filter(c => c.value)

  const venueAddress = venue ? [venue.address, venue.city, venue.state].filter(Boolean).join(', ') : null
  const truckParking = v(packet, 'load_in', 'truck_parking')
  const busParking = v(packet, 'load_in', 'bus_parking')
  const dockBays = v(packet, 'load_in', 'dock_bays')
  const dockHeight = v(packet, 'load_in', 'dock_height')
  const accessNotes = v(packet, 'load_in', 'load_in_access')
  const unionAffiliation = v(packet, 'crew', 'union_affiliation')
  const minStage = v(packet, 'crew', 'min_stagehands')
  const mealBreak = v(packet, 'crew', 'union_meal_break')
  const powerService = v(packet, 'power', 'service_type')
  const powerAvail = v(packet, 'power', 'available_to_production')
  const splLimit = v(packet, 'audio', 'decibel_limit')
  const promoterRep = f(fields, 'promoter_rep')
  const settlementContact = f(fields, 'settlement_contact')

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="bg-white border border-zinc-200 rounded-xl px-5 py-4 mb-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Day Sheet</p>
          <h1 className="text-xl font-bold text-zinc-900">{tour?.artist_name}</h1>
          {tour && tour.tour_name !== tour.artist_name && (
            <p className="text-sm text-zinc-500">{tour.tour_name}</p>
          )}
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
            <p className="text-sm font-medium text-zinc-700">{venue?.name}</p>
            <p className="text-sm text-zinc-500">{formattedDate}</p>
          </div>
        </div>

        {/* Day-of Notes */}
        {daySheetNotes && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 mb-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700 mb-2">Day-of Notes</p>
            <p className="text-sm text-zinc-800 whitespace-pre-wrap">{daySheetNotes}</p>
          </div>
        )}

        {/* Call Times */}
        {callTimes.length > 0 && (
          <div className="bg-white border border-zinc-200 rounded-xl px-5 py-4 mb-4">
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-3">Call Times</h2>
            <div className="space-y-0.5">
              {callTimes.map((row, i) => {
                const cd = row.confirmKey ? confDate(confirmations, row.confirmKey) : null
                return (
                  <div key={i} className={`flex items-baseline gap-4 py-2 border-t border-zinc-100 first:border-0 ${row.warn ? 'bg-amber-50/50 -mx-2 px-2 rounded' : ''}`}>
                    <span className={`text-lg font-bold tabular-nums w-28 shrink-0 ${row.warn ? 'text-amber-700' : 'text-zinc-900'}`}>
                      {row.value}
                    </span>
                    <div>
                      <span className={`text-sm ${row.warn ? 'text-amber-700 font-medium' : 'text-zinc-600'}`}>
                        {row.label}
                      </span>
                      {cd && <span className="ml-2 text-xs text-emerald-600">✓ {cd}</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Show Info */}
        {(promoterRep || settlementContact) && (
          <div className="bg-white border border-zinc-200 rounded-xl px-5 py-4 mb-4">
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-3">Show Info</h2>
            <div className="space-y-2">
              {promoterRep && <ShareField label="Promoter / Rep" value={promoterRep} />}
              {settlementContact && <ShareField label="Settlement Contact" value={settlementContact} />}
            </div>
          </div>
        )}

        {/* Contacts */}
        {(venueContacts.length > 0 || tourContacts.length > 0) && (
          <div className="bg-white border border-zinc-200 rounded-xl px-5 py-4 mb-4">
            {venueContacts.length > 0 && (
              <>
                <h2 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-3">Venue Contacts</h2>
                <div className="space-y-3 mb-5">
                  {venueContacts.map((c, i) => {
                    const cd = c.confirmKey ? confDate(confirmations, c.confirmKey) : null
                    return (
                      <div key={i}>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">{c.label}</p>
                        <p className="text-sm text-zinc-800 mt-0.5">{c.value}</p>
                        {cd && <p className="text-xs text-emerald-600 mt-0.5">✓ {cd}</p>}
                      </div>
                    )
                  })}
                </div>
              </>
            )}
            {tourContacts.length > 0 && (
              <>
                <h2 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-3 border-t border-zinc-100 pt-4">Tour Contacts</h2>
                <div className="space-y-3">
                  {tourContacts.map((c, i) => (
                    <div key={i}>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">{c.label}</p>
                      <p className="text-sm text-zinc-800 mt-0.5">{c.value}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Venue & Load-In */}
        {(venueAddress || dockBays || truckParking) && (
          <div className="bg-white border border-zinc-200 rounded-xl px-5 py-4 mb-4">
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-3">Venue & Load-In</h2>
            <div className="space-y-2.5">
              {venueAddress && <ShareField label="Address" value={venueAddress} />}
              {dockBays && <ShareField label="Loading Bays" value={dockBays} />}
              {dockHeight && <ShareField label="Dock Height" value={dockHeight} />}
              {accessNotes && <ShareField label="Access Notes" value={accessNotes} />}
              {truckParking && <ShareField label="Truck / Trailer Parking" value={truckParking} />}
              {busParking && <ShareField label="Bus Parking" value={busParking} />}
            </div>
          </div>
        )}

        {/* Key Logistics */}
        {(unionAffiliation || powerService || splLimit) && (
          <div className="bg-white border border-zinc-200 rounded-xl px-5 py-4 mb-4">
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-3">Key Logistics</h2>
            <div className="space-y-2.5">
              {unionAffiliation && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">Union</p>
                  <p className="text-sm text-zinc-800 mt-0.5">{unionAffiliation}{minStage ? ` · Min ${minStage} stagehands` : ''}</p>
                </div>
              )}
              {mealBreak && <ShareField label="Meal Break Rules" value={mealBreak} />}
              {powerService && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">Power Service</p>
                  <p className="text-sm text-zinc-800 mt-0.5">{powerService}{powerAvail ? ` · ${powerAvail} available` : ''}</p>
                </div>
              )}
              {splLimit && <ShareField label="SPL Limit" value={splLimit} />}
            </div>
          </div>
        )}

        <p className="text-center text-[10px] text-zinc-400 mt-6">
          Powered by StagePage
        </p>
      </div>
    </div>
  )
}

function ShareField({ label, value }: { label: string; value: string }) {
  if (!value) return null
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">{label}</p>
      <p className="text-sm text-zinc-800 mt-0.5 whitespace-pre-wrap">{value}</p>
    </div>
  )
}
