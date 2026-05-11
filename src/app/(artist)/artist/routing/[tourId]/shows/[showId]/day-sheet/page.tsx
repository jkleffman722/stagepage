import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ArrowLeft, Printer } from 'lucide-react'
import { DaySheetNotesEditor } from '@/components/artist/DaySheetNotesEditor'
import { ShareDaySheetButton } from '@/components/artist/ShareDaySheetButton'
import { cn } from '@/lib/utils'
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

export default async function DaySheetPage({ params }: Props) {
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

  const [riderResult, packetResult, shareResult] = await Promise.all([
    supabase.from('tech_riders').select('id').eq('tour_id', tourId).single(),
    venue?.id
      ? supabase.from('technical_packets').select('id').eq('venue_id', venue.id).single()
      : Promise.resolve({ data: null }),
    supabase.from('advance_shares')
      .select('token')
      .eq('advance_id', advance.id)
      .eq('created_by', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
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
  const existingToken = shareResult.data?.token ?? null

  const formattedDate = new Date(show.event_date + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  })
  const printHref = `/artist/routing/${tourId}/shows/${showId}/day-sheet/print`

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
    { label: 'Hard Curfew', value: v(packet, 'schedule', 'hard_curfew'), confirmKey: 'schedule.hard_curfew', critical: true, warn: true },
    { label: 'Load-Out', value: v(packet, 'schedule', 'load_out_window'), confirmKey: 'schedule.load_out_window' },
    { label: 'Must Clear By', value: v(packet, 'schedule', 'clear_by') },
  ].filter(r => r.value)

  type ContactRow = { label: string; value: string; confirmKey?: string; critical?: boolean }
  const venueContacts: ContactRow[] = [
    { label: 'Production Manager', value: v(packet, 'contacts', 'production_manager'), confirmKey: 'contacts.production_manager', critical: true },
    { label: 'General Manager', value: v(packet, 'contacts', 'general_manager'), confirmKey: 'contacts.general_manager' },
    { label: 'Stage Manager', value: v(packet, 'contacts', 'stage_manager'), confirmKey: 'contacts.stage_manager' },
    { label: 'Security', value: v(packet, 'contacts', 'security_contact'), confirmKey: 'contacts.security_contact' },
    { label: 'Emergency / After Hours', value: v(packet, 'contacts', 'emergency_contact'), confirmKey: 'contacts.emergency_contact', critical: true },
    { label: 'Box Office', value: v(packet, 'contacts', 'box_office'), confirmKey: 'contacts.box_office' },
  ].filter(c => c.value)

  const tourContacts: ContactRow[] = [
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
  const hasShowInfo = promoterRep || settlementContact || dealType

  const venueAddress = venue ? [venue.address, venue.city, venue.state].filter(Boolean).join(', ') : null
  const dockBays = v(packet, 'load_in', 'dock_bays')
  const dockHeight = v(packet, 'load_in', 'dock_height')
  const dockDoor = v(packet, 'load_in', 'dock_door_dimensions')
  const accessNotes = v(packet, 'load_in', 'load_in_access')
  const truckParking = v(packet, 'load_in', 'truck_parking')
  const busParking = v(packet, 'load_in', 'bus_parking')
  const deadStorage = v(packet, 'load_in', 'dead_case_storage')
  const shorePower = v(packet, 'power', 'shore_power')
  const shorePowerParking = v(packet, 'load_in', 'shore_power_parking')
  const hasLoadIn = venueAddress || dockBays || truckParking || busParking

  const unionAffiliation = v(packet, 'crew', 'union_affiliation')
  const minStage = v(packet, 'crew', 'min_stagehands')
  const mealBreak = v(packet, 'crew', 'union_meal_break')
  const powerService = v(packet, 'power', 'service_type')
  const powerAvail = v(packet, 'power', 'available_to_production')
  const splLimit = v(packet, 'audio', 'decibel_limit')
  const hasLogistics = unionAffiliation || powerService || splLimit

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="max-w-4xl mx-auto px-6 py-8">

        {/* Nav */}
        <div className="mb-6 flex items-center justify-between">
          <Link href="/artist/routing" className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-700">
            <ArrowLeft className="h-4 w-4" />
            Routing
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href={printHref}
              target="_blank"
              className="inline-flex items-center gap-1.5 text-sm rounded-md border border-zinc-200 bg-white px-3 py-1.5 hover:bg-zinc-50 transition-colors"
            >
              <Printer className="h-3.5 w-3.5" />
              Print / PDF
            </Link>
            <ShareDaySheetButton
              advanceId={advance.id}
              showId={showId}
              tourId={tourId}
              existingToken={existingToken}
            />
          </div>
        </div>

        {/* Header */}
        <div className="bg-white border border-zinc-200 rounded-xl px-6 py-5 mb-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Day Sheet</p>
              <h1 className="text-2xl font-bold text-zinc-900">{tour.artist_name}</h1>
              {tour.tour_name !== tour.artist_name && (
                <p className="text-sm text-zinc-500 mt-0.5">{tour.tour_name}</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-base font-semibold text-zinc-800">{venue?.name ?? 'TBD'}</p>
              {venue && <p className="text-sm text-zinc-500">{[venue.city, venue.state].filter(Boolean).join(', ')}</p>}
              <p className="text-sm text-zinc-500 mt-0.5">{formattedDate}</p>
            </div>
          </div>
        </div>

        {/* Day-of Notes — top, always visible */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-6 py-4 mb-4">
          <DaySheetNotesEditor advanceId={advance.id} initialValue={f(fields, 'day_sheet_notes')} />
        </div>

        {/* Call Times */}
        {callTimes.length > 0 && (
          <div className="bg-white border border-zinc-200 rounded-xl px-6 py-5 mb-4">
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-4">Call Times</h2>
            <table className="w-full">
              <tbody>
                {callTimes.map((row, i) => {
                  const cd = row.confirmKey ? confDate(confirmations, row.confirmKey) : null
                  return (
                    <tr key={i} className={cn('border-t border-zinc-100 first:border-0', row.warn && 'bg-amber-50/40')}>
                      <td className="py-2.5 pr-6 w-36 align-middle">
                        <span className={cn('text-base font-semibold tabular-nums', row.warn ? 'text-amber-700' : 'text-zinc-900')}>
                          {row.value}
                        </span>
                      </td>
                      <td className="py-2.5 align-middle">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={cn('text-sm', row.warn ? 'text-amber-700 font-medium' : 'text-zinc-600')}>
                            {row.label}{row.warn ? ' ⚠' : ''}
                          </span>
                          {cd && (
                            <span className="text-xs text-emerald-600">✓ {cd}</span>
                          )}
                          {!cd && row.critical && (
                            <span className="text-xs text-amber-500">unconfirmed</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Promoter / Settlement */}
        {hasShowInfo && (
          <div className="bg-white border border-zinc-200 rounded-xl px-6 py-5 mb-4">
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-4">Show Info</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {promoterRep && <InfoBlock label="Promoter / Rep" value={promoterRep} />}
              {settlementContact && <InfoBlock label="Settlement Contact" value={settlementContact} />}
              {dealType && <InfoBlock label="Deal Type" value={dealType} />}
            </div>
          </div>
        )}

        {/* Contacts — side by side on desktop */}
        {(venueContacts.length > 0 || tourContacts.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {venueContacts.length > 0 && (
              <div className="bg-white border border-zinc-200 rounded-xl px-6 py-5">
                <h2 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-4">Venue Contacts</h2>
                <div className="space-y-3.5">
                  {venueContacts.map((c, i) => {
                    const cd = c.confirmKey ? confDate(confirmations, c.confirmKey) : null
                    return (
                      <div key={i}>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">{c.label}</p>
                        <p className="text-sm text-zinc-800 mt-0.5">{c.value}</p>
                        {cd && <p className="text-xs text-emerald-600 mt-0.5">✓ {cd}</p>}
                        {!cd && c.critical && <p className="text-xs text-amber-500 mt-0.5">unconfirmed</p>}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
            {tourContacts.length > 0 && (
              <div className="bg-white border border-zinc-200 rounded-xl px-6 py-5">
                <h2 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-4">Tour Contacts</h2>
                <div className="space-y-3.5">
                  {tourContacts.map((c, i) => (
                    <div key={i}>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">{c.label}</p>
                      <p className="text-sm text-zinc-800 mt-0.5">{c.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Venue & Load-In */}
        {hasLoadIn && (
          <div className="bg-white border border-zinc-200 rounded-xl px-6 py-5 mb-4">
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-4">Venue & Load-In</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {venueAddress && <InfoBlock label="Address" value={venueAddress} />}
              {dockBays && <InfoBlock label="Loading Bays" value={dockBays} />}
              {dockHeight && <InfoBlock label="Dock Height" value={dockHeight} />}
              {dockDoor && <InfoBlock label="Dock Door (W × H)" value={dockDoor} />}
              {accessNotes && <InfoBlock label="Access Notes" value={accessNotes} span2 />}
              {truckParking && <InfoBlock label="Truck / Trailer Parking" value={truckParking} span2 />}
              {busParking && <InfoBlock label="Bus Parking" value={busParking} span2 />}
              {deadStorage && <InfoBlock label="Dead Case Storage" value={deadStorage} span2 />}
              {shorePower && <InfoBlock label="Shore Power" value={shorePower} />}
              {shorePowerParking && <InfoBlock label="Shore Power at Parking" value={shorePowerParking} />}
            </div>
          </div>
        )}

        {/* Key Logistics */}
        {hasLogistics && (
          <div className="bg-white border border-zinc-200 rounded-xl px-6 py-5 mb-4">
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-4">Key Logistics</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {unionAffiliation && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-400 mb-0.5">Union</p>
                  <p className="text-sm text-zinc-800">{unionAffiliation}</p>
                  {minStage && <p className="text-xs text-zinc-500 mt-0.5">Min {minStage} stagehands</p>}
                  {confDate(confirmations, 'crew.union_affiliation') && (
                    <p className="text-xs text-emerald-600 mt-0.5">✓ {confDate(confirmations, 'crew.union_affiliation')}</p>
                  )}
                </div>
              )}
              {mealBreak && <InfoBlock label="Meal Break Rules" value={mealBreak} />}
              {powerService && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-400 mb-0.5">Power Service</p>
                  <p className="text-sm text-zinc-800">{powerService}</p>
                  {powerAvail && <p className="text-xs text-zinc-500 mt-0.5">{powerAvail} available to production</p>}
                  {confDate(confirmations, 'power.service_type') && (
                    <p className="text-xs text-emerald-600 mt-0.5">✓ {confDate(confirmations, 'power.service_type')}</p>
                  )}
                </div>
              )}
              {splLimit && <InfoBlock label="SPL Limit" value={splLimit} />}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

function InfoBlock({ label, value, span2 }: { label: string; value: string; span2?: boolean }) {
  if (!value) return null
  return (
    <div className={span2 ? 'sm:col-span-2' : ''}>
      <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-400 mb-0.5">{label}</p>
      <p className="text-sm text-zinc-800 whitespace-pre-wrap">{value}</p>
    </div>
  )
}
