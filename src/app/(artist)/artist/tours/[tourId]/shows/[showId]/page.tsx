import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdvanceCheck } from '@/components/artist/AdvanceCheck'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { ArrowLeft, Calendar, MapPin } from 'lucide-react'
import type { TechRiderSection, PacketSection } from '@/lib/types'

interface Props {
  params: Promise<{ tourId: string; showId: string }>
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  approved: { label: 'Packet Received', className: 'text-green-700 border-green-200 bg-green-50' },
  pending:  { label: 'Pending',         className: 'text-yellow-700 border-yellow-200 bg-yellow-50' },
  denied:   { label: 'Access Denied',   className: 'text-red-600 border-red-200 bg-red-50' },
  revoked:  { label: 'Access Revoked',  className: 'text-zinc-500 border-zinc-200' },
}

export default async function ShowDetailPage({ params }: Props) {
  const { tourId, showId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Verify tour ownership
  const { data: tour } = await supabase
    .from('tours')
    .select('id, tour_name, artist_name')
    .eq('id', tourId)
    .eq('profile_id', user.id)
    .single()

  if (!tour) notFound()

  // Fetch show with venue
  const { data: show } = await supabase
    .from('shows')
    .select('*, venues(id, name, city, state, capacity)')
    .eq('id', showId)
    .eq('tour_id', tourId)
    .single()

  if (!show) notFound()

  // Fetch share request status for this show's venue
  const { data: request } = show.venue_id
    ? await supabase
        .from('share_requests')
        .select('id, status')
        .eq('venue_id', show.venue_id)
        .eq('requester_profile_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
    : { data: null }

  // Fetch tech rider sections for this tour
  const { data: rider } = await supabase
    .from('tech_riders')
    .select('id')
    .eq('tour_id', tourId)
    .single()

  const riderSections: TechRiderSection[] = []
  if (rider) {
    const { data } = await supabase
      .from('tech_rider_sections')
      .select('*')
      .eq('rider_id', rider.id)
    if (data) riderSections.push(...data)
  }

  // Fetch venue packet sections if access is approved
  const packetSections: PacketSection[] = []
  let packetLastUpdated: string | null = null

  if (request?.status === 'approved' && show.venue_id) {
    const { data: packet } = await supabase
      .from('technical_packets')
      .select('id, last_updated_at')
      .eq('venue_id', show.venue_id)
      .single()

    if (packet) {
      packetLastUpdated = packet.last_updated_at
      const { data } = await supabase
        .from('packet_sections')
        .select('*')
        .eq('packet_id', packet.id)
      if (data) packetSections.push(...data)
    }
  }

  const venue = show.venues as { id: string; name: string; city: string | null; state: string | null; capacity: number | null } | null
  const formattedDate = new Date(show.event_date + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  })
  const status = request?.status
  const statusConfig = status ? STATUS_CONFIG[status] : null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href={`/artist/tours/${tourId}`}
          className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-600 mb-4 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {tour.tour_name}
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-zinc-700">
              <Calendar className="h-4 w-4 text-zinc-400" />
              <span className="text-xl font-bold">{formattedDate}</span>
            </div>
            {venue ? (
              <div className="flex items-center gap-2 text-zinc-500">
                <MapPin className="h-4 w-4 text-zinc-400 shrink-0" />
                <span className="font-medium text-zinc-700">{venue.name}</span>
                {(venue.city || venue.state) && (
                  <span>· {[venue.city, venue.state].filter(Boolean).join(', ')}</span>
                )}
                {venue.capacity && (
                  <span>· cap. {venue.capacity.toLocaleString()}</span>
                )}
              </div>
            ) : (
              <p className="text-sm text-zinc-400 italic">No venue assigned</p>
            )}
          </div>

          {statusConfig ? (
            <Badge variant="outline" className={`text-xs shrink-0 ${statusConfig.className}`}>
              {statusConfig.label}
            </Badge>
          ) : venue ? (
            <Badge variant="outline" className="text-xs text-zinc-400 shrink-0">
              No packet yet
            </Badge>
          ) : null}
        </div>
      </div>

      {/* Advance Check */}
      <AdvanceCheck
        riderSections={riderSections}
        packetSections={packetSections}
        packetStatus={request?.status ?? null}
        packetLastUpdated={packetLastUpdated}
        venueId={show.venue_id}
        hasVenue={!!venue}
        tourId={tourId}
        riderId={rider?.id ?? null}
      />
    </div>
  )
}
