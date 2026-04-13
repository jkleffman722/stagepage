import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdvanceSheet } from '@/components/artist/AdvanceSheet'
import type { TechRiderSection, PacketSection, ShowAdvance } from '@/lib/types'
import Link from 'next/link'
import { ArrowLeft, ClipboardCheck } from 'lucide-react'

interface Props {
  params: Promise<{ tourId: string; showId: string }>
}

export default async function AdvancePage({ params }: Props) {
  const { tourId, showId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Verify tour + show ownership
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

  // Fetch all data in parallel
  const [riderResult, advanceResult, requestResult] = await Promise.all([
    supabase.from('tech_riders').select('id').eq('tour_id', tourId).single(),
    supabase.from('show_advances').select('*').eq('show_id', showId).single(),
    show.venue_id
      ? supabase
          .from('share_requests')
          .select('status')
          .eq('venue_id', show.venue_id)
          .eq('requester_profile_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()
      : Promise.resolve({ data: null }),
  ])

  // Fetch rider sections
  const riderSections: TechRiderSection[] = []
  if (riderResult.data) {
    const { data } = await supabase
      .from('tech_rider_sections')
      .select('*')
      .eq('rider_id', riderResult.data.id)
    if (data) riderSections.push(...data)
  }

  // Fetch venue packet sections if approved
  const packetSections: PacketSection[] = []
  const venuePacketApproved = requestResult.data?.status === 'approved'
  if (venuePacketApproved && show.venue_id) {
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

  // Get or create show advance record
  let advance = advanceResult.data as ShowAdvance | null
  if (!advance) {
    const { data } = await supabase
      .from('show_advances')
      .insert({ show_id: showId })
      .select('*')
      .single()
    advance = data as ShowAdvance | null
  }

  const venue = show.venues as {
    id: string; name: string; address: string | null
    city: string | null; state: string | null; capacity: number | null
  } | null

  const formattedDate = new Date(show.event_date + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  })

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/artist/tours/${tourId}/shows/${showId}`}
          className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-600 mb-4 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Advance Check
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-zinc-400" />
              <h1 className="text-2xl font-bold tracking-tight">Advance Sheet</h1>
            </div>
            <p className="text-zinc-500 mt-0.5 text-sm">
              {tour.artist_name} · {formattedDate}
              {venue && ` · ${venue.name}`}
            </p>
          </div>
        </div>
      </div>

      {advance && (
        <AdvanceSheet
          showId={showId}
          advanceId={advance.id}
          initialFields={advance.fields}
          tour={tour}
          show={{ event_date: show.event_date }}
          venue={venue}
          venueId={show.venue_id}
          riderSections={riderSections}
          packetSections={packetSections}
          venuePacketApproved={venuePacketApproved}
        />
      )}
    </div>
  )
}
