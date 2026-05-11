import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PrintTrigger } from '@/components/shared/PrintTrigger'
import type { TechRiderSection, PacketSection, FieldConfirmation } from '@/lib/types'

interface Props {
  params: Promise<{ tourId: string; showId: string }>
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

function DSSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="break-inside-avoid mb-4">
      <h2 className="text-[7px] font-bold uppercase tracking-widest text-zinc-400 border-b border-zinc-200 pb-1 mb-2">
        {title}
      </h2>
      {children}
    </div>
  )
}

export default async function DaySheetPrintPage({ params }: Props) {
  const { tourId, showId } = await params
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
    id: string; name: string; address: string | null; city: string | null; state: string | null; capacity: number | null
  } | null

  const { data: advance } = await supabase
    .from('show_advances')
    .select('*')
    .eq('show_id', showId)
    .single()
  if (!advance) notFound()

  const fields = (advance.fields ?? {}) as Record<string, string | null>
  const confirmations = (advance.field_confirmations ?? {}) as Record<string, FieldConfirmation>

  const [riderResult, packetResult] = await Promise.all([
    supabase.from('tech_riders').select('id').eq('tour_id', tourId).single(),
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
  const generatedDate = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  const daySheetNotes = f(fields, 'day_sheet_notes')

  type TimeRow = { label: string; value: string; confirmKey?: string; critical?: boolean; warn?: boolean }
  const callTimes: TimeRow[] = [
    { label: 'Earliest Crew Access', value: v(packet, 'schedule', 'crew_access'), confirmKey: 'schedule.crew_access', critical: true },
    { label: 'Load-In Call', value: f(fields, 'load_in_call') },
    { label: 'Crew Call', value: f(fields, 'crew_call') },
    { label: 'Load-In Window', value: v(packet, 'schedule', 'load_in_window'), confirmKey: 'schedule.load_in_window' },
    { label: 'Soundcheck', value: v(packet, 'schedule', 'soundcheck_window'), confirmKey: 'schedule.soundcheck_window' },
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
    { label: 'General Manager', value: v(packet, 'contacts', 'general_manager'), confirmKey: 'contacts.general_manager' },
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

  const promoterRep = f(fields, 'promoter_rep')
  const settlementContact = f(fields, 'settlement_contact')
  const dealType = f(fields, 'deal_type')

  const venueAddress = venue ? [venue.address, venue.city, venue.state].filter(Boolean).join(', ') : null
  const unionAffiliation = v(packet, 'crew', 'union_affiliation')
  const mealBreak = v(packet, 'crew', 'union_meal_break')
  const minStage = v(packet, 'crew', 'min_stagehands')
  const powerService = v(packet, 'power', 'service_type')
  const powerAvail = v(packet, 'power', 'available_to_production')
  const splLimit = v(packet, 'audio', 'decibel_limit')
  const dockBays = v(packet, 'load_in', 'dock_bays')
  const dockHeight = v(packet, 'load_in', 'dock_height')
  const truckParking = v(packet, 'load_in', 'truck_parking')
  const busParking = v(packet, 'load_in', 'bus_parking')
  const accessNotes = v(packet, 'load_in', 'load_in_access')
  const shorePower = v(packet, 'power', 'shore_power')

  return (
    <>
      <PrintTrigger />
      <div className="bg-white text-zinc-900 font-sans p-8 max-w-4xl mx-auto print:p-0 print:max-w-none">

        {/* Header */}
        <div className="border-b-2 border-zinc-900 pb-3 mb-5 flex items-end justify-between">
          <div>
            <p className="text-[8px] font-bold uppercase tracking-widest text-zinc-400 mb-0.5">Day Sheet</p>
            <h1 className="text-2xl font-bold tracking-tight">{tour.artist_name}</h1>
            {tour.tour_name !== tour.artist_name && (
              <p className="text-xs text-zinc-500">{tour.tour_name}</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-base font-semibold">{venue?.name ?? 'TBD'}</p>
            {venue && <p className="text-xs text-zinc-500">{[venue.city, venue.state].filter(Boolean).join(', ')}</p>}
            <p className="text-xs text-zinc-500">{formattedDate}</p>
            <p className="text-[8px] text-zinc-400 mt-1">Generated {generatedDate}</p>
          </div>
        </div>

        {/* Day-of Notes (print if filled) */}
        {daySheetNotes && (
          <div className="mb-4 border border-amber-300 bg-amber-50 rounded px-3 py-2">
            <p className="text-[7px] font-bold uppercase tracking-widest text-amber-700 mb-1">Day-of Notes</p>
            <p className="text-[11px] text-zinc-800 whitespace-pre-wrap leading-snug">{daySheetNotes}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-6">
          <div>
            {/* Call Times */}
            {callTimes.length > 0 && (
              <DSSection title="Call Times">
                <table className="w-full">
                  <tbody>
                    {callTimes.map((row, i) => {
                      const cd = row.confirmKey ? confDate(confirmations, row.confirmKey) : null
                      return (
                        <tr key={i} className={row.warn ? 'bg-amber-50' : ''}>
                          <td className="py-0.5 pr-4 w-24 align-top">
                            <span className={`text-[12px] font-bold tabular-nums ${row.warn ? 'text-amber-700' : 'text-zinc-900'}`}>
                              {row.value}
                            </span>
                          </td>
                          <td className="py-0.5 align-top">
                            <p className={`text-[10px] ${row.warn ? 'text-amber-700 font-semibold' : 'text-zinc-600'}`}>
                              {row.label}
                            </p>
                            {cd && <p className="text-[7.5px] text-emerald-600">✓ {cd}</p>}
                            {!cd && row.critical && <p className="text-[7.5px] text-amber-500">** UNCONFIRMED **</p>}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </DSSection>
            )}

            {/* Show Info */}
            {(promoterRep || settlementContact || dealType) && (
              <DSSection title="Show Info">
                <div className="space-y-1.5">
                  {promoterRep && <PrintField label="Promoter / Rep" value={promoterRep} />}
                  {settlementContact && <PrintField label="Settlement Contact" value={settlementContact} />}
                  {dealType && <PrintField label="Deal Type" value={dealType} />}
                </div>
              </DSSection>
            )}

            {/* Key Logistics */}
            {(unionAffiliation || powerService || splLimit) && (
              <DSSection title="Key Logistics">
                <div className="space-y-1.5">
                  {unionAffiliation && (
                    <div>
                      <p className="text-[7.5px] font-bold uppercase tracking-wide text-zinc-400">Union</p>
                      <p className="text-[10px] text-zinc-800">{unionAffiliation}{minStage ? ` · Min ${minStage} stagehands` : ''}</p>
                      {confDate(confirmations, 'crew.union_affiliation') && (
                        <p className="text-[7.5px] text-emerald-600">✓ {confDate(confirmations, 'crew.union_affiliation')}</p>
                      )}
                    </div>
                  )}
                  {mealBreak && <PrintField label="Meal Break Rules" value={mealBreak} />}
                  {powerService && (
                    <div>
                      <p className="text-[7.5px] font-bold uppercase tracking-wide text-zinc-400">Power Service</p>
                      <p className="text-[10px] text-zinc-800">{powerService}{powerAvail ? ` · ${powerAvail} available` : ''}</p>
                      {confDate(confirmations, 'power.service_type') && (
                        <p className="text-[7.5px] text-emerald-600">✓ {confDate(confirmations, 'power.service_type')}</p>
                      )}
                    </div>
                  )}
                  {splLimit && <PrintField label="SPL Limit" value={splLimit} />}
                </div>
              </DSSection>
            )}

            {/* Venue & Load-In */}
            {(venueAddress || dockBays || truckParking) && (
              <DSSection title="Venue & Load-In">
                <div className="space-y-1.5">
                  {venueAddress && <PrintField label="Address" value={venueAddress} />}
                  {dockBays && <PrintField label="Loading Bays" value={dockBays} />}
                  {dockHeight && <PrintField label="Dock Height" value={dockHeight} />}
                  {accessNotes && <PrintField label="Access Notes" value={accessNotes} />}
                  {truckParking && <PrintField label="Truck / Trailer Parking" value={truckParking} />}
                  {busParking && <PrintField label="Bus Parking" value={busParking} />}
                  {shorePower && <PrintField label="Shore Power" value={shorePower} />}
                </div>
              </DSSection>
            )}
          </div>

          <div>
            {/* Venue Contacts */}
            {venueContacts.length > 0 && (
              <DSSection title="Venue Contacts">
                <div className="space-y-2">
                  {venueContacts.map((c, i) => {
                    const cd = c.confirmKey ? confDate(confirmations, c.confirmKey) : null
                    return (
                      <div key={i}>
                        <p className="text-[7.5px] font-bold uppercase tracking-wide text-zinc-400">{c.label}</p>
                        <p className="text-[10px] text-zinc-800 leading-snug">{c.value}</p>
                        {cd && <p className="text-[7.5px] text-emerald-600">✓ {cd}</p>}
                      </div>
                    )
                  })}
                </div>
              </DSSection>
            )}

            {/* Tour Contacts */}
            {tourContacts.length > 0 && (
              <DSSection title="Tour Contacts">
                <div className="space-y-2">
                  {tourContacts.map((c, i) => (
                    <div key={i}>
                      <p className="text-[7.5px] font-bold uppercase tracking-wide text-zinc-400">{c.label}</p>
                      <p className="text-[10px] text-zinc-800 leading-snug">{c.value}</p>
                    </div>
                  ))}
                </div>
              </DSSection>
            )}
          </div>
        </div>

      </div>
    </>
  )
}

function PrintField({ label, value }: { label: string; value: string }) {
  if (!value) return null
  return (
    <div>
      <p className="text-[7.5px] font-bold uppercase tracking-wide text-zinc-400">{label}</p>
      <p className="text-[10px] text-zinc-800 whitespace-pre-wrap leading-snug">{value}</p>
    </div>
  )
}
