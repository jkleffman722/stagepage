import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { RoutingPageClient } from '@/components/artist/RoutingPageClient'

type PacketStatus = 'approved' | 'pending' | 'denied' | 'revoked' | null
type ShowHealth = 'critical' | 'warning' | 'on-track' | 'ready' | 'no-venue'

function computeHealth(
  venueId: string | null,
  packetStatus: PacketStatus,
  advanceFilledCount: number,
  daysUntil: number,
): ShowHealth {
  if (!venueId) return 'no-venue'
  if (!packetStatus || packetStatus === 'denied' || packetStatus === 'revoked') {
    return daysUntil < 21 ? 'critical' : 'warning'
  }
  if (packetStatus === 'pending') return daysUntil < 14 ? 'critical' : 'warning'
  if (advanceFilledCount < 3) return daysUntil < 14 ? 'critical' : 'warning'
  if (advanceFilledCount < 12) return 'on-track'
  return 'ready'
}

export default async function RoutingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: tours } = await supabase
    .from('tours')
    .select('id, tour_name, artist_name')
    .eq('profile_id', user.id)
    .order('created_at', { ascending: false })

  const allTours = tours ?? []
  const tourIds = allTours.map(t => t.id)

  const showsResult = tourIds.length > 0
    ? await supabase
        .from('shows')
        .select('id, tour_id, event_date, venue_id, venues(id, name, city, state)')
        .in('tour_id', tourIds)
        .order('event_date', { ascending: true })
    : { data: [] as unknown[] }

  type RawShow = {
    id: string
    tour_id: string
    event_date: string
    venue_id: string | null
    venues: { id: string; name: string; city: string | null; state: string | null } | { id: string; name: string; city: string | null; state: string | null }[] | null
  }

  const rawShows = (showsResult.data ?? []) as RawShow[]
  const showIds = rawShows.map(s => s.id)
  const venueIds = [...new Set(rawShows.map(s => s.venue_id).filter(Boolean) as string[])]

  // Parallel fetch: share requests, advances, packet data, venue owner profiles
  const [reqsResult, advancesResult, packetsResult, venueOwnersResult] = await Promise.all([
    showIds.length > 0
      ? supabase.from('share_requests').select('show_id, status').in('show_id', showIds)
      : Promise.resolve({ data: [] as { show_id: string; status: string }[] }),
    showIds.length > 0
      ? supabase.from('show_advances').select('show_id, fields, field_confirmations').in('show_id', showIds)
      : Promise.resolve({ data: [] as { show_id: string; fields: Record<string, unknown>; field_confirmations: Record<string, unknown> }[] }),
    venueIds.length > 0
      ? supabase
          .from('technical_packets')
          .select('id, venue_id, packet_attachments(id, file_name, storage_path), packet_sections(section_key, fields)')
          .in('venue_id', venueIds)
      : Promise.resolve({ data: [] as unknown[] }),
    venueIds.length > 0
      ? supabase
          .from('venues')
          .select('id, owner_id, profiles(display_name, contact_email)')
          .in('id', venueIds)
      : Promise.resolve({ data: [] as unknown[] }),
  ])

  const requestsByShow: Record<string, PacketStatus> = {}
  for (const r of reqsResult.data ?? []) {
    requestsByShow[r.show_id] = r.status as PacketStatus
  }

  const HOT_POINT_KEYS = [
    'stage.full_deck', 'stage.wing_sl', 'stage.wing_sr', 'stage.trim_height',
    'load_in.dock_bays', 'load_in.dock_height', 'audio.decibel_limit',
    'schedule.hard_curfew', 'schedule.crew_access', 'hospitality.wifi_notes',
    'crew.union_affiliation', 'power.service_type',
  ]

  const advancesByShow: Record<string, number> = {}
  const confirmedByShow: Record<string, number> = {}
  for (const a of (advancesResult.data ?? []) as { show_id: string; fields: Record<string, unknown>; field_confirmations: Record<string, unknown> }[]) {
    const fields = (a.fields ?? {}) as Record<string, unknown>
    advancesByShow[a.show_id] = Object.values(fields).filter(v => v !== null && v !== '' && v !== undefined).length
    const confs = (a.field_confirmations ?? {}) as Record<string, unknown>
    confirmedByShow[a.show_id] = HOT_POINT_KEYS.filter(k => !!confs[k]).length
  }

  type Attachment = { id: string; file_name: string; storage_path: string }
  type RawPacket = {
    id: string
    venue_id: string
    packet_attachments: Attachment[]
    packet_sections: { section_key: string; fields: Record<string, string | null> }[]
  }

  const attachmentsByVenue: Record<string, Attachment[]> = {}
  const contactByVenue: Record<string, string> = {}

  for (const p of (packetsResult.data ?? []) as RawPacket[]) {
    attachmentsByVenue[p.venue_id] = p.packet_attachments ?? []
    const contactsSection = (p.packet_sections ?? []).find(s => s.section_key === 'contacts')
    if (contactsSection?.fields?.production_manager) {
      contactByVenue[p.venue_id] = contactsSection.fields.production_manager
    }
  }

  // Venue owner profiles as fallback contact
  type VenueOwner = {
    id: string
    owner_id: string
    profiles: { display_name: string | null; contact_email: string | null } | { display_name: string | null; contact_email: string | null }[] | null
  }
  const ownerByVenue: Record<string, string> = {}
  for (const v of (venueOwnersResult.data ?? []) as VenueOwner[]) {
    const profile = Array.isArray(v.profiles) ? v.profiles[0] : v.profiles
    if (profile?.display_name || profile?.contact_email) {
      ownerByVenue[v.id] = [profile.display_name, profile.contact_email].filter(Boolean).join(' · ')
    }
  }

  const tourMap = Object.fromEntries(allTours.map(t => [t.id, t]))
  const now = new Date()
  now.setHours(0, 0, 0, 0)

  const showRows = rawShows.map(show => {
    const venue = Array.isArray(show.venues) ? show.venues[0] : show.venues
    const tour = tourMap[show.tour_id]
    const eventDate = new Date(show.event_date + 'T12:00:00')
    const daysUntil = Math.ceil((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    const packetStatus = requestsByShow[show.id] ?? null
    const advanceFilled = advancesByShow[show.id] ?? 0
    const health = computeHealth(show.venue_id, packetStatus, advanceFilled, daysUntil)

    return {
      id: show.id,
      tour_id: show.tour_id,
      event_date: show.event_date,
      venue_id: show.venue_id,
      venue_name: venue?.name ?? null,
      venue_city: venue?.city ?? null,
      venue_state: venue?.state ?? null,
      tour_name: tour?.tour_name ?? '',
      artist_name: tour?.artist_name ?? '',
      health,
      packetStatus,
      advanceFilled,
      hasAdvance: show.id in advancesByShow,
      confirmedHotPoints: confirmedByShow[show.id] ?? 0,
      attachments: show.venue_id ? (attachmentsByVenue[show.venue_id] ?? []) : [],
      primaryContact: show.venue_id
        ? (contactByVenue[show.venue_id] ?? ownerByVenue[show.venue_id] ?? null)
        : null,
      ctaHref: `/artist/routing/${show.tour_id}/shows/${show.id}/advance`,
      daySheetHref: `/artist/routing/${show.tour_id}/shows/${show.id}/day-sheet`,
      daysUntil,
    }
  })

  return (
    <RoutingPageClient tours={allTours} shows={showRows} />
  )
}
